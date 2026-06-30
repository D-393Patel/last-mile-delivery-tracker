import { OrderStatus, Prisma, Role } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/errors";
import { createOrder } from "@/lib/orders";
import { createOrderSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as OrderStatus | null;
    const zoneId = url.searchParams.get("zoneId");
    const agentId = url.searchParams.get("agentId");
    const search = url.searchParams.get("search");

    const scope = session.role === Role.CUSTOMER
      ? { customerId: session.userId }
      : session.role === Role.AGENT
        ? { assignedAgentId: session.userId }
        : {};

    const filters: Prisma.OrderWhereInput[] = [];
    if (zoneId) filters.push({ OR: [{ pickupZoneId: zoneId }, { dropZoneId: zoneId }] });
    if (search) filters.push({ OR: [
      { trackingNumber: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ] });

    const orders = await db.order.findMany({
      where: {
        ...scope,
        ...(status && Object.values(OrderStatus).includes(status) ? { status } : {}),
        ...(agentId && session.role === Role.ADMIN ? { assignedAgentId: agentId } : {}),
        ...(filters.length ? { AND: filters } : {}),
      },
      include: { customer: { select: { id: true, name: true, email: true } }, assignedAgent: { select: { id: true, name: true } }, pickupZone: true, dropZone: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return Response.json({ orders });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession([Role.CUSTOMER, Role.ADMIN]);
    const input = createOrderSchema.parse(await request.json());
    const order = await createOrder(input, session);
    return Response.json({ order }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
