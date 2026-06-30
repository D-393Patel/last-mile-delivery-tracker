"use client";

import { FormEvent, useState } from "react";
import { StatusPill } from "@/components/status-pill";

type TrackResult = {
  trackingNumber: string;
  status: string;
  pickupZone: { name: string };
  dropZone: { name: string };
  trackingEvents: { status: string; message: string; createdAt: string }[];
};

export function TrackingSearch() {
  const [tracking, setTracking] = useState("");
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setResult(null);
    const response = await fetch(`/api/track/${encodeURIComponent(tracking.trim())}`);
    const body = await response.json();
    if (!response.ok) setError(body.error?.message || "Unable to find this order.");
    else setResult(body.order);
    setBusy(false);
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="tracking">Tracking number</label>
        <input id="tracking" className="input" placeholder="e.g. LMD260630A1B2C3" value={tracking} onChange={(e) => setTracking(e.target.value)} required />
      </div>
      <button className="button" disabled={busy}>{busy ? "Searching…" : "Track delivery"}</button>
      {error && <div className="form-error">{error}</div>}
      {result && (
        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span className="tracking-code">{result.trackingNumber}</span><StatusPill status={result.status} />
          </div>
          <div className="subtle" style={{ fontSize: 13 }}>{result.pickupZone.name} → {result.dropZone.name}</div>
          <div className="timeline-message" style={{ marginTop: 14 }}>{result.trackingEvents.at(-1)?.message}</div>
        </div>
      )}
    </form>
  );
}
