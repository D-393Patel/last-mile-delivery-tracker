import { OrderStatus, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { queueStatusNotifications } from "@/lib/notifications";

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function findBestAgent(pickup: { zoneId: string; latitude: number; longitude: number }) {
  const agents = await db.agentProfile.findMany({
    where: { available: true, user: { active: true, role: Role.AGENT } },
    include: {
      user: {
        include: {
          _count: {
            select: {
              assignedOrders: {
                where: { status: { in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY] } },
              },
            },
          },
        },
      },
    },
  });

  const ranked = agents
    .filter((agent) => agent.user._count.assignedOrders < agent.maxActiveOrders)
    .map((agent) => ({
      ...agent,
      sameZone: agent.zoneId === pickup.zoneId,
      distanceKm:
        agent.currentLatitude == null || agent.currentLongitude == null
          ? Number.POSITIVE_INFINITY
          : haversineKm(pickup.latitude, pickup.longitude, agent.currentLatitude, agent.currentLongitude),
      activeOrders: agent.user._count.assignedOrders,
    }))
    .sort((a, b) =>
      Number(b.sameZone) - Number(a.sameZone) ||
      a.distanceKm - b.distanceKm ||
      a.activeOrders - b.activeOrders,
    );

  return ranked[0] ?? null;
}

export async function assignOrder(orderId: string, actorId: string, requestedAgentId?: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError("Order not found.", 404, "ORDER_NOT_FOUND");
  if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
    throw new AppError("A completed order cannot be reassigned.", 409, "ORDER_FINALIZED");
  }

  let agentId = requestedAgentId;
  let selectionReason = "Manually assigned by admin";
  if (!agentId) {
    const best = await findBestAgent({
      zoneId: order.pickupZoneId,
      latitude: order.pickupLatitude,
      longitude: order.pickupLongitude,
    });
    if (!best) throw new AppError("No available agent has capacity for this order.", 409, "NO_AGENT_AVAILABLE");
    agentId = best.userId;
    selectionReason = `Auto-assigned: ${best.sameZone ? "same zone, " : ""}${Number.isFinite(best.distanceKm) ? `${best.distanceKm.toFixed(1)} km away, ` : ""}${best.activeOrders} active orders`;
  }

  const agent = await db.user.findFirst({
    where: { id: agentId, role: Role.AGENT, active: true, agentProfile: { available: true } },
  });
  if (!agent) throw new AppError("Selected agent is not available.", 422, "AGENT_UNAVAILABLE");

  const updated = await db.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { assignedAgentId: agentId, status: OrderStatus.ASSIGNED, version: { increment: 1 } },
    });
    await tx.trackingEvent.create({
      data: { orderId, actorId, status: OrderStatus.ASSIGNED, message: `${agent.name} assigned. ${selectionReason}` },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "ORDER_ASSIGNED",
        entityType: "Order",
        entityId: orderId,
        before: { assignedAgentId: order.assignedAgentId, status: order.status },
        after: { assignedAgentId: agentId, status: OrderStatus.ASSIGNED, selectionReason },
      },
    });
    return updated;
  });
  await queueStatusNotifications(orderId, OrderStatus.ASSIGNED);
  return updated;
}
