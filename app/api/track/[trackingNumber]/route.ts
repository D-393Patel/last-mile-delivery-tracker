import { db } from "@/lib/db";
import { AppError, errorResponse } from "@/lib/errors";

export async function GET(_request: Request, context: { params: Promise<{ trackingNumber: string }> }) {
  try {
    const { trackingNumber } = await context.params;
    const order = await db.order.findUnique({
      where: { trackingNumber: trackingNumber.toUpperCase() },
      select: {
        trackingNumber: true, status: true,
        pickupZone: { select: { name: true } }, dropZone: { select: { name: true } },
        assignedAgent: { select: { name: true } }, scheduledDate: true, createdAt: true,
        trackingEvents: { select: { status: true, message: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!order) throw new AppError("Tracking number not found.", 404, "TRACKING_NOT_FOUND");
    return Response.json({ order });
  } catch (error) {
    return errorResponse(error);
  }
}
