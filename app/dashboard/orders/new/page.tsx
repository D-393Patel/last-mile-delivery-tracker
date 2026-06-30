import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrderForm } from "@/components/order-form";

export default async function NewOrderPage() {
  const session = await getSession(); if (!session) redirect("/login"); if (session.role === Role.AGENT) redirect("/dashboard/orders");
  const customers = session.role === Role.ADMIN ? await db.user.findMany({ where: { role: Role.CUSTOMER, active: true }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }) : [];
  return <><div className="page-title"><div><h1>Book a delivery</h1><p>Get the exact charge before you commit.</p></div></div><OrderForm customers={customers} /></>;
}
