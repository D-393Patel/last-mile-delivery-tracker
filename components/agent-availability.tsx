"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AgentAvailability({ latitude, longitude, available }: { latitude: number | null; longitude: number | null; available: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/agents/me/location", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: Number(form.get("latitude")), longitude: Number(form.get("longitude")), available: form.get("available") === "true" }),
    });
    const body = await response.json();
    setMessage(response.ok ? "Availability and location updated." : body.error?.message || "Update failed.");
    if (response.ok) router.refresh();
    setBusy(false);
  }

  return <section className="card" style={{ marginBottom: 26 }}><div className="card-head"><h2>Dispatch availability</h2><span className={`status ${available ? "delivered" : "cancelled"}`}>{available ? "Available" : "Offline"}</span></div><form className="card-body form" onSubmit={submit}><div className="form-grid three"><div className="field"><label>Latitude</label><input className="input" name="latitude" type="number" min="-90" max="90" step="0.000001" defaultValue={latitude ?? ""} required /></div><div className="field"><label>Longitude</label><input className="input" name="longitude" type="number" min="-180" max="180" step="0.000001" defaultValue={longitude ?? ""} required /></div><div className="field"><label>Status</label><select className="select" name="available" defaultValue={String(available)}><option value="true">Available</option><option value="false">Offline</option></select></div></div>{message && <div className={message.includes("updated") ? "form-success" : "form-error"}>{message}</div>}<button className="button secondary small" disabled={busy}>{busy ? "Saving…" : "Update dispatch status"}</button></form></section>;
}
