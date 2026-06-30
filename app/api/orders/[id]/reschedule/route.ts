import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import { rescheduleOrder } from "@/lib/orders";
import { rescheduleSchema } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession([Role.CUSTOMER]);
    const { id } = await context.params;
    const input = rescheduleSchema.parse(await request.json());
    const order = await rescheduleOrder(id, new Date(input.scheduledDate), input.notes, session.userId);
    return Response.json({ order });
  } catch (error) {
    return errorResponse(error);
  }
}
