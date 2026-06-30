import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");
  return <main className="auth-page"><aside className="auth-aside"><Logo /><div className="auth-quote">The calm, capable command centre behind every successful delivery.</div><span style={{ color: "#b9cbc4", position: "relative", zIndex: 1 }}>Pricing · Dispatch · Tracking</span></aside><section className="auth-main"><div className="auth-panel"><Link href="/" className="subtle">← Back home</Link><h1>Welcome back.</h1><p className="subtle" style={{ marginBottom: 28 }}>Sign in to manage your deliveries.</p><AuthForm mode="login" /><div className="demo-box"><strong>Demo accounts</strong><br />Admin: admin@dispatch.local / Admin@123<br />Agent: agent@dispatch.local / Agent@123<br />Customer: customer@dispatch.local / Customer@123</div></div></section></main>;
}
