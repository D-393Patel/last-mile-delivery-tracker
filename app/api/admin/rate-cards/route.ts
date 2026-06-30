import { OrderType, Role } from "@prisma/client";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/errors";
import { decimal } from "@/lib/pricing";

const schema = z.object({
  originZoneId: z.string().min(1), destinationZoneId: z.string().min(1),
  orderType: z.enum(["B2B", "B2C"]), baseWeightKg: z.coerce.number().positive(),
  baseRate: z.coerce.number().nonnegative(), additionalRateKg: z.coerce.number().nonnegative(),
});

export async function POST(request: Request) {
  try {
    await requireSession([Role.ADMIN]);
    const input = schema.parse(await request.json());
    const rateCard = await db.rateCard.upsert({
      where: { originZoneId_destinationZoneId_orderType: { originZoneId: input.originZoneId, destinationZoneId: input.destinationZoneId, orderType: input.orderType as OrderType } },
      create: { ...input, baseWeightKg: decimal(input.baseWeightKg), baseRate: decimal(input.baseRate), additionalRateKg: decimal(input.additionalRateKg) },
      update: { baseWeightKg: decimal(input.baseWeightKg), baseRate: decimal(input.baseRate), additionalRateKg: decimal(input.additionalRateKg), active: true },
    });
    return Response.json({ rateCard });
  } catch (error) {
    return errorResponse(error);
  }
}
