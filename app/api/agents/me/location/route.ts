import { Role } from "@prisma/client";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/errors";

export async function PATCH(request: Request) {
  try {
    const session = await requireSession([Role.AGENT]);
    const input = z.object({
      latitude: z.coerce.number().min(-90).max(90),
      longitude: z.coerce.number().min(-180).max(180),
      available: z.boolean().optional(),
    }).parse(await request.json());
    const agent = await db.agentProfile.update({
      where: { userId: session.userId },
      data: { currentLatitude: input.latitude, currentLongitude: input.longitude, available: input.available },
    });
    return Response.json({ agent });
  } catch (error) {
    return errorResponse(error);
  }
}
