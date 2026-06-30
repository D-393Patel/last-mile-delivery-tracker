import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import { updateOrderStatus } from "@/lib/orders";
import { statusUpdateSchema } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession([Role.AGENT, Role.ADMIN]);
    const { id } = await context.params;
    const input = statusUpdateSchema.parse(await request.json());
    const order = await updateOrderStatus(id, input, session);
    return Response.json({ order });
  } catch (error) {
    return errorResponse(error);
  }
}
