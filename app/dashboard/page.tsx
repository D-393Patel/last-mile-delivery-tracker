import Link from "next/link";
import { OrderStatus, Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusPill } from "@/components/status-pill";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const scope = session.role === Role.CUSTOMER ? { customerId: session.userId } : session.role === Role.AGENT ? { assignedAgentId: session.userId } : {};
  const activeStatuses = [OrderStatus.CREATED, OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.RESCHEDULED];
  const [total, active, delivered, failed, recent] = await Promise.all([
    db.order.count({ where: scope }), db.order.count({ where: { ...scope, status: { in: activeStatuses } } }),
    db.order.count({ where: { ...scope, status: OrderStatus.DELIVERED } }), db.order.count({ where: { ...scope, status: OrderStatus.FAILED } }),
    db.order.findMany({ where: scope, include: { customer: { select: { name: true } }, assignedAgent: { select: { name: true } }, pickupZone: true, dropZone: true }, orderBy: { updatedAt: "desc" }, take: 7 }),
  ]);
  const heading = session.role === Role.ADMIN ? "Good morning, operator." : session.role === Role.AGENT ? "Your route, at a glance." : `Hello, ${session.name.split(" ")[0]}.`;
  return <><div className="page-title"><div><h1>{heading}</h1><p>{session.role === Role.ADMIN ? "Monitor the network and resolve exceptions." : "Here’s what is moving today."}</p></div>{session.role !== Role.AGENT && <Link href="/dashboard/orders/new" className="button">+ New order</Link>}</div><section className="stats-grid"><div className="stat-card"><div className="stat-label">Total orders</div><div className="stat-value">{total}</div><div className="stat-note">All recorded deliveries</div></div><div className="stat-card"><div className="stat-label">Active</div><div className="stat-value">{active}</div><div className="stat-note">Currently in the network</div></div><div className="stat-card"><div className="stat-label">Delivered</div><div className="stat-value">{delivered}</div><div className="stat-note">Successfully completed</div></div><div className="stat-card"><div className="stat-label">Needs attention</div><div className="stat-value">{failed}</div><div className="stat-note">Failed delivery attempts</div></div></section><section className="card"><div className="card-head"><h2>Recent activity</h2><Link href="/dashboard/orders" className="button ghost small">View all →</Link></div>{recent.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Tracking</th>{session.role === Role.ADMIN && <th>Customer</th>}<th>Route</th><th>Status</th><th>Charge</th><th>Updated</th></tr></thead><tbody>{recent.map((order) => <tr key={order.id}><td><Link className="tracking-code" href={`/dashboard/orders/${order.id}`}>{order.trackingNumber}</Link></td>{session.role === Role.ADMIN && <td>{order.customer.name}</td>}<td>{order.pickupZone.name} → {order.dropZone.name}</td><td><StatusPill status={order.status} /></td><td>₹{Number(order.totalCharge).toFixed(2)}</td><td>{order.updatedAt.toLocaleDateString("en-IN")}</td></tr>)}</tbody></table></div> : <div className="empty">No orders yet. Your first delivery will appear here.</div>}</section></>;
}
