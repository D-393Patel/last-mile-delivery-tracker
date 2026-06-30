import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getSession()) redirect("/dashboard");
  return <main className="auth-page"><aside className="auth-aside"><Logo /><div className="auth-quote">From quote to doorstep, know exactly what happens next.</div><span style={{ color: "#b9cbc4", position: "relative", zIndex: 1 }}>Join as a customer in under a minute.</span></aside><section className="auth-main"><div className="auth-panel"><Link href="/" className="subtle">← Back home</Link><h1>Get moving.</h1><p className="subtle" style={{ marginBottom: 28 }}>Create your customer account.</p><AuthForm mode="register" /></div></section></main>;
}
