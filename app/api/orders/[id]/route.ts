import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError, errorResponse } from "@/lib/errors";
import { allowedTransitions } from "@/lib/status-machine";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const order = await db.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        assignedAgent: { select: { id: true, name: true, phone: true } },
        pickupZone: true,
        dropZone: true,
        trackingEvents: { include: { actor: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } },
        deliveryAttempts: { orderBy: { attemptNumber: "asc" } },
        notifications: { select: { channel: true, recipient: true, state: true, createdAt: true, sentAt: true }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!order) throw new AppError("Order not found.", 404, "ORDER_NOT_FOUND");
    const permitted = session.role === Role.ADMIN || order.customerId === session.userId || order.assignedAgentId === session.userId;
    if (!permitted) throw new AppError("You cannot view this order.", 403, "FORBIDDEN");
    return Response.json({ order, allowedTransitions: allowedTransitions(order.status, session.role) });
  } catch (error) {
    return errorResponse(error);
  }
}
