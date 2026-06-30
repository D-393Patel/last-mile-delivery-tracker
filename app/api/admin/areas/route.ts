import { Role } from "@prisma/client";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/errors";

const schema = z.object({
  zoneId: z.string().min(1), name: z.string().trim().min(2), postalCode: z.string().trim().min(3).max(12),
  latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180),
});

export async function POST(request: Request) {
  try {
    await requireSession([Role.ADMIN]);
    const input = schema.parse(await request.json());
    const area = await db.area.create({ data: input });
    return Response.json({ area }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
