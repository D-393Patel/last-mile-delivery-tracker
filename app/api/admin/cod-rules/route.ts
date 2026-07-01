import { OrderType, Role } from "@prisma/client";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/errors";
import { decimal } from "@/lib/pricing";

const schema = z.object({
  orderType: z.enum(["B2B", "B2C"]),
  flatFee: z.coerce.number().nonnegative(),
  percentage: z.coerce.number().nonnegative(),
  minimumFee: z.coerce.number().nonnegative(),
  maximumFee: z.coerce.number().positive().nullable().optional(),
}).refine(
  (input) => input.maximumFee == null || input.maximumFee >= input.minimumFee,
  { path: ["maximumFee"], message: "Maximum fee must be greater than or equal to the minimum fee." },
);

export async function POST(request: Request) {
  try {
    await requireSession([Role.ADMIN]);
    const input = schema.parse(await request.json());
    const data = {
      flatFee: decimal(input.flatFee), percentage: decimal(input.percentage),
      minimumFee: decimal(input.minimumFee), maximumFee: input.maximumFee ? decimal(input.maximumFee) : null, active: true,
    };
    const codRule = await db.codRule.upsert({
      where: { orderType: input.orderType as OrderType },
      create: { orderType: input.orderType as OrderType, ...data }, update: data,
    });
    return Response.json({ codRule });
  } catch (error) {
    return errorResponse(error);
  }
}
