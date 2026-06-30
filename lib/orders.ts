import { OrderStatus, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { assignOrder } from "@/lib/assignment";
import { buildQuote, decimal } from "@/lib/pricing";
import { canTransition, statusLabel } from "@/lib/status-machine";
import { queueStatusNotifications } from "@/lib/notifications";
import type { z } from "zod";
import type { createOrderSchema, statusUpdateSchema } from "@/lib/validation";

type CreateOrderInput = z.infer<typeof createOrderSchema>;
type StatusInput = z.infer<typeof statusUpdateSchema>;

function trackingNumber() {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `LMD${date}${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function createOrder(input: CreateOrderInput, actor: { userId: string; role: Role }) {
  const customerId = actor.role === Role.ADMIN ? input.customerId : actor.userId;
  if (!customerId) throw new AppError("Select a customer for this order.", 422, "CUSTOMER_REQUIRED");

  const customer = await db.user.findFirst({ where: { id: customerId, role: Role.CUSTOMER, active: true } });
  if (!customer) throw new AppError("Customer not found.", 404, "CUSTOMER_NOT_FOUND");

  const quote = await buildQuote(input);
  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        trackingNumber: trackingNumber(),
        customerId,
        createdById: actor.userId,
        pickupAddress: input.pickupAddress,
        pickupPostalCode: input.pickupPostalCode,
        pickupLatitude: quote.pickupArea.latitude,
        pickupLongitude: quote.pickupArea.longitude,
        pickupZoneId: quote.pickupArea.zoneId,
        dropAddress: input.dropAddress,
        dropPostalCode: input.dropPostalCode,
        dropLatitude: quote.dropArea.latitude,
        dropLongitude: quote.dropArea.longitude,
        dropZoneId: quote.dropArea.zoneId,
        lengthCm: decimal(input.lengthCm),
        breadthCm: decimal(input.breadthCm),
        heightCm: decimal(input.heightCm),
        actualWeightKg: decimal(input.actualWeightKg),
        volumetricWeightKg: decimal(quote.volumetricWeightKg),
        billableWeightKg: decimal(quote.billableWeightKg),
        orderType: input.orderType,
        paymentType: input.paymentType,
        declaredValue: decimal(input.declaredValue),
        baseCharge: decimal(quote.baseCharge),
        codSurcharge: decimal(quote.codSurcharge),
        totalCharge: decimal(quote.totalCharge),
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
        deliveryNotes: input.deliveryNotes,
        deliveryAttempts: { create: { attemptNumber: 1, scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null } },
      },
    });
    await tx.trackingEvent.create({
      data: { orderId: created.id, actorId: actor.userId, status: OrderStatus.CREATED, message: "Order confirmed and pricing locked." },
    });
    await tx.auditLog.create({
      data: { actorId: actor.userId, action: "ORDER_CREATED", entityType: "Order", entityId: created.id, after: { trackingNumber: created.trackingNumber, totalCharge: quote.totalCharge } },
    });
    return created;
  });

  await queueStatusNotifications(order.id, OrderStatus.CREATED);
  if (input.autoAssign) {
    try {
      return await assignOrder(order.id, actor.userId);
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== "NO_AGENT_AVAILABLE") throw error;
    }
  }
  return order;
}

export async function updateOrderStatus(orderId: string, input: StatusInput, actor: { userId: string; role: Role }) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError("Order not found.", 404, "ORDER_NOT_FOUND");
  if (actor.role === Role.AGENT && order.assignedAgentId !== actor.userId) {
    throw new AppError("This order is assigned to another agent.", 403, "NOT_ASSIGNED");
  }
  if (!canTransition(order.status, input.status, actor.role)) {
    throw new AppError(`Cannot move an order from ${statusLabel(order.status)} to ${statusLabel(input.status)}.`, 409, "INVALID_TRANSITION");
  }
  if (input.status === OrderStatus.FAILED && !input.failureReason) {
    throw new AppError("A failure reason is required.", 422, "FAILURE_REASON_REQUIRED");
  }

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: orderId, version: order.version },
      data: { status: input.status, version: { increment: 1 } },
    });
    await tx.trackingEvent.create({
      data: {
        orderId,
        actorId: actor.userId,
        status: input.status,
        message: input.message || (input.status === OrderStatus.FAILED ? `Delivery failed: ${input.failureReason}` : `Order marked ${statusLabel(input.status)}.`),
        metadata: input.latitude == null ? undefined : { latitude: input.latitude, longitude: input.longitude },
      },
    });
    if (input.status === OrderStatus.FAILED) {
      const latest = await tx.deliveryAttempt.findFirst({ where: { orderId }, orderBy: { attemptNumber: "desc" } });
      if (latest) await tx.deliveryAttempt.update({ where: { id: latest.id }, data: { attemptedAt: new Date(), outcome: OrderStatus.FAILED, failureReason: input.failureReason } });
    }
    await tx.auditLog.create({
      data: { actorId: actor.userId, action: "STATUS_CHANGED", entityType: "Order", entityId: orderId, before: { status: order.status }, after: { status: input.status } },
    });
    return result;
  });

  await queueStatusNotifications(orderId, input.status);
  return updated;
}

export async function rescheduleOrder(orderId: string, scheduledDate: Date, notes: string | undefined, customerId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { _count: { select: { deliveryAttempts: true } } } });
  if (!order) throw new AppError("Order not found.", 404, "ORDER_NOT_FOUND");
  if (order.customerId !== customerId) throw new AppError("You cannot reschedule this order.", 403, "FORBIDDEN");
  if (order.status !== OrderStatus.FAILED) throw new AppError("Only failed deliveries can be rescheduled.", 409, "NOT_FAILED");
  if (scheduledDate <= new Date()) throw new AppError("Choose a future delivery date.", 422, "INVALID_DATE");

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: orderId, version: order.version },
      data: { status: OrderStatus.RESCHEDULED, scheduledDate, assignedAgentId: null, version: { increment: 1 } },
    });
    await tx.deliveryAttempt.create({ data: { orderId, attemptNumber: order._count.deliveryAttempts + 1, scheduledDate } });
    await tx.trackingEvent.create({
      data: { orderId, actorId: customerId, status: OrderStatus.RESCHEDULED, message: notes || `Delivery rescheduled for ${scheduledDate.toLocaleDateString("en-IN")}.` },
    });
    return result;
  });
  await queueStatusNotifications(orderId, OrderStatus.RESCHEDULED);
  try { return await assignOrder(orderId, customerId); } catch { return updated; }
}
