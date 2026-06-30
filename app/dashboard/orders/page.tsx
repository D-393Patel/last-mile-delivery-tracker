import Link from "next/link";
import { OrderStatus, Prisma, Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusPill } from "@/components/status-pill";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; search?: string; zoneId?: string; agentId?: string }> }) {
  const session = await getSession(); if (!session) redirect("/login");
  const params = await searchParams;
  const status = Object.values(OrderStatus).includes(params.status as OrderStatus) ? params.status as OrderStatus : undefined;
  const scope = session.role === Role.CUSTOMER ? { customerId: session.userId } : session.role === Role.AGENT ? { assignedAgentId: session.userId } : {};
  const conditions: Prisma.OrderWhereInput[] = [];
  if (params.search) conditions.push({ OR: [
    { trackingNumber: { contains: params.search, mode: "insensitive" } },
    ...(session.role === Role.ADMIN ? [{ customer: { name: { contains: params.search, mode: "insensitive" as const } } }] : []),
  ] });
  if (session.role === Role.ADMIN && params.zoneId) conditions.push({ OR: [{ pickupZoneId: params.zoneId }, { dropZoneId: params.zoneId }] });
  const [orders, zones, agents] = await Promise.all([
    db.order.findMany({ where: { ...scope, ...(status ? { status } : {}), ...(session.role === Role.ADMIN && params.agentId ? { assignedAgentId: params.agentId } : {}), ...(conditions.length ? { AND: conditions } : {}) }, include: { customer: true, assignedAgent: true, pickupZone: true, dropZone: true }, orderBy: { createdAt: "desc" } }),
    session.role === Role.ADMIN ? db.zone.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    session.role === Role.ADMIN ? db.user.findMany({ where: { role: Role.AGENT, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);
  return <><div className="page-title"><div><h1>{session.role === Role.ADMIN ? "All orders" : session.role === Role.AGENT ? "Assigned route" : "My orders"}</h1><p>Search, filter, and open the complete delivery timeline.</p></div>{session.role !== Role.AGENT && <Link href="/dashboard/orders/new" className="button">+ New order</Link>}</div><form className="filters"><input name="search" className="input" placeholder={session.role === Role.ADMIN ? "Tracking or customer" : "Search tracking number"} defaultValue={params.search} /><select className="select" name="status" defaultValue={status || ""}><option value="">All statuses</option>{Object.values(OrderStatus).map((value) => <option key={value}>{value}</option>)}</select>{session.role === Role.ADMIN && <><select className="select" name="zoneId" defaultValue={params.zoneId || ""}><option value="">All zones</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select><select className="select" name="agentId" defaultValue={params.agentId || ""}><option value="">All agents</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></>}<button className="button secondary small">Apply filters</button></form><div className="card">{orders.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Tracking</th>{session.role === Role.ADMIN && <th>Customer</th>}<th>Route</th><th>Agent</th><th>Status</th><th>Total</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><Link href={`/dashboard/orders/${order.id}`} className="tracking-code">{order.trackingNumber}</Link></td>{session.role === Role.ADMIN && <td>{order.customer.name}</td>}<td>{order.pickupZone.name} → {order.dropZone.name}</td><td>{order.assignedAgent?.name || "Unassigned"}</td><td><StatusPill status={order.status} /></td><td>₹{Number(order.totalCharge).toFixed(2)}</td></tr>)}</tbody></table></div> : <div className="empty">No matching orders found.</div>}</div></>;
}
