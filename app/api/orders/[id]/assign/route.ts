import { Role } from "@prisma/client";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { assignOrder } from "@/lib/assignment";
import { errorResponse } from "@/lib/errors";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession([Role.ADMIN]);
    const { id } = await context.params;
    const input = z.object({ agentId: z.string().min(1).optional() }).parse(await request.json());
    const order = await assignOrder(id, session.userId, input.agentId);
    return Response.json({ order });
  } catch (error) {
    return errorResponse(error);
  }
}
