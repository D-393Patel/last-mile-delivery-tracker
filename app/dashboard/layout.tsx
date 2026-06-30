import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth";

const links = {
  CUSTOMER: [
    { href: "/dashboard", icon: "⌂", label: "Overview" },
    { href: "/dashboard/orders", icon: "▤", label: "My orders" },
    { href: "/dashboard/orders/new", icon: "+", label: "Book delivery" },
  ],
  AGENT: [
    { href: "/dashboard", icon: "⌂", label: "Overview" },
    { href: "/dashboard/orders", icon: "▤", label: "My route" },
  ],
  ADMIN: [
    { href: "/dashboard", icon: "⌂", label: "Overview" },
    { href: "/dashboard/orders", icon: "▤", label: "All orders" },
    { href: "/dashboard/orders/new", icon: "+", label: "Create order" },
    { href: "/dashboard/admin", icon: "⚙", label: "Configuration" },
  ],
} satisfies Record<Role, { href: string; icon: string; label: string }[]>;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <div className="dashboard-shell"><aside className="sidebar"><Logo href="/dashboard" /><div className="sidebar-nav-label eyebrow" style={{ color: "#71847d", padding: "0 12px" }}>Workspace</div><nav className="sidebar-nav">{links[session.role].map((link) => <Link className="side-link" href={link.href} key={link.href}><span className="side-icon">{link.icon}</span><span>{link.label}</span></Link>)}</nav><div className="user-card"><div className="user-name">{session.name}</div><div className="user-role">{session.role.toLowerCase()}</div></div></aside><section className="dashboard-main"><header className="dashboard-topbar"><div><strong>Operations console</strong><div className="subtle" style={{ fontSize: 11 }}>Live workspace</div></div><LogoutButton /></header><div className="dashboard-content">{children}</div></section></div>;
}
