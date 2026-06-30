"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const body = await response.json();
    if (!response.ok) { setError(body.error?.message || "Please check your details."); setBusy(false); return; }
    router.push("/dashboard"); router.refresh();
  }

  return (
    <form className="form" onSubmit={submit}>
      {mode === "register" && <><div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" className="input" autoComplete="name" required /></div><div className="field"><label htmlFor="phone">Phone (optional)</label><input id="phone" name="phone" className="input" autoComplete="tel" /></div></>}
      <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" className="input" autoComplete="email" required /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" minLength={8} className="input" autoComplete={mode === "login" ? "current-password" : "new-password"} required /></div>
      {error && <div className="form-error">{error}</div>}
      <button className="button" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
      <p className="subtle" style={{ textAlign: "center", fontSize: 13 }}>{mode === "login" ? "New to Dispatch?" : "Already have an account?"} <Link href={mode === "login" ? "/register" : "/login"} style={{ color: "var(--brand)", fontWeight: 800 }}>{mode === "login" ? "Create an account" : "Sign in"}</Link></p>
    </form>
  );
}
