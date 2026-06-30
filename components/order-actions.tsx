"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderActions({ orderId, role, status, transitions, agents = [] }: { orderId: string; role: string; status: string; transitions: string[]; agents?: { id: string; name: string }[] }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function post(path: string, body: object) { setBusy(true); setError(""); const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) setError(data.error?.message || "Action failed."); else router.refresh(); setBusy(false); }
  if (role === "CUSTOMER" && status !== "FAILED") return null;
  return <div className="card"><div className="card-head"><h3>Available actions</h3></div><div className="card-body form">
    {role === "CUSTOMER" && status === "FAILED" && <form className="form" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); post(`/api/orders/${orderId}/reschedule`, { scheduledDate: new Date(String(data.get("date"))).toISOString(), notes: data.get("notes") }); }}><div className="field"><label>New delivery date</label><input className="input" name="date" type="datetime-local" required /></div><div className="field"><label>Notes</label><input className="input" name="notes" placeholder="Preferred time or instructions" /></div><button className="button" disabled={busy}>Reschedule delivery</button></form>}
    {role === "ADMIN" && <form className="form" onSubmit={(e) => { e.preventDefault(); const agentId = String(new FormData(e.currentTarget).get("agentId") || ""); post(`/api/orders/${orderId}/assign`, agentId ? { agentId } : {}); }}><div className="field"><label>Assign delivery agent</label><select className="select" name="agentId"><option value="">Auto-select best available agent</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></div><button className="button secondary" disabled={busy}>Assign agent</button></form>}
    {(role === "AGENT" || role === "ADMIN") && transitions.length > 0 && <form className="form" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); post(`/api/orders/${orderId}/status`, { status: data.get("status"), message: data.get("message") || undefined, failureReason: data.get("failureReason") || undefined }); }}><div className="field"><label>Update status</label><select className="select" name="status" required>{transitions.map((value) => <option key={value}>{value}</option>)}</select></div><div className="field"><label>Update note</label><input className="input" name="message" placeholder="Optional customer-facing message" /></div><div className="field"><label>Failure reason (required for failed)</label><input className="input" name="failureReason" placeholder="Customer unavailable, address issue…" /></div><button className="button" disabled={busy}>Save status update</button></form>}
    {error && <div className="form-error">{error}</div>}
  </div></div>;
}
