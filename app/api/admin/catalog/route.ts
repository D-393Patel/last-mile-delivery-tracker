import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/errors";

export async function GET() {
  try {
    await requireSession([Role.ADMIN]);
    const [zones, rateCards, codRules, agents, customers] = await Promise.all([
      db.zone.findMany({ include: { areas: true }, orderBy: { name: "asc" } }),
      db.rateCard.findMany({ include: { originZone: true, destinationZone: true }, orderBy: [{ originZone: { name: "asc" } }, { destinationZone: { name: "asc" } }] }),
      db.codRule.findMany({ orderBy: { orderType: "asc" } }),
      db.user.findMany({ where: { role: Role.AGENT }, select: { id: true, name: true, email: true, phone: true, agentProfile: true } }),
      db.user.findMany({ where: { role: Role.CUSTOMER, active: true }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    ]);
    return Response.json({ zones, rateCards, codRules, agents, customers });
  } catch (error) {
    return errorResponse(error);
  }
}
