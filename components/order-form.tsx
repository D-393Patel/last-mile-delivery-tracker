"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Customer = { id: string; name: string; email: string };
type Quote = { volumetricWeightKg: number; billableWeightKg: number; baseCharge: number; codSurcharge: number; totalCharge: number; pickupZone: string; dropZone: string; formula: string };

export function OrderForm({ customers = [] }: { customers?: Customer[] }) {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [snapshot, setSnapshot] = useState<Record<string, FormDataEntryValue> | null>(null);
  const hasCustomers = customers.length > 0;

  const payload = useMemo(() => snapshot ? {
    ...snapshot,
    lengthCm: Number(snapshot.lengthCm), breadthCm: Number(snapshot.breadthCm), heightCm: Number(snapshot.heightCm),
    actualWeightKg: Number(snapshot.actualWeightKg), declaredValue: Number(snapshot.declaredValue || 0),
  } : null, [snapshot]);

  async function getQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setQuote(null);
    const values = Object.fromEntries(new FormData(event.currentTarget)); setSnapshot(values);
    const data = { ...values, lengthCm: Number(values.lengthCm), breadthCm: Number(values.breadthCm), heightCm: Number(values.heightCm), actualWeightKg: Number(values.actualWeightKg), declaredValue: Number(values.declaredValue || 0) };
    const response = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const body = await response.json();
    if (!response.ok) setError(body.error?.message || "Could not calculate this quote."); else setQuote(body.quote);
    setBusy(false);
  }

  async function confirm() {
    if (!payload) return; setBusy(true); setError("");
    const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, autoAssign: true }) });
    const body = await response.json();
    if (!response.ok) { setError(body.error?.message || "Could not create this order."); setBusy(false); return; }
    router.push(`/dashboard/orders/${body.order.id}`); router.refresh();
  }

  return <div className="two-col"><form className="card" onSubmit={getQuote}><div className="card-head"><h2>Delivery details</h2><span className="status">Step 1 of 2</span></div><div className="card-body form">
    {hasCustomers && <div className="field"><label htmlFor="customerId">Customer</label><select id="customerId" name="customerId" className="select" required><option value="">Select customer</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} · {customer.email}</option>)}</select></div>}
    <div className="form-grid"><div className="field"><label htmlFor="pickupPostalCode">Pickup postal code</label><input className="input" id="pickupPostalCode" name="pickupPostalCode" defaultValue="380001" required /></div><div className="field"><label htmlFor="dropPostalCode">Drop postal code</label><input className="input" id="dropPostalCode" name="dropPostalCode" defaultValue="382010" required /></div></div>
    <div className="form-grid"><div className="field"><label htmlFor="pickupAddress">Pickup address</label><textarea className="textarea" id="pickupAddress" name="pickupAddress" defaultValue="12 Relief Road, Ahmedabad" required /></div><div className="field"><label htmlFor="dropAddress">Drop address</label><textarea className="textarea" id="dropAddress" name="dropAddress" defaultValue="21 Sector 10, Gandhinagar" required /></div></div>
    <div><div className="detail-label" style={{ marginBottom: 10 }}>Package measurements</div><div className="form-grid three"><div className="field"><label htmlFor="lengthCm">Length (cm)</label><input className="input" type="number" min="0.1" step="0.1" id="lengthCm" name="lengthCm" defaultValue="30" required /></div><div className="field"><label htmlFor="breadthCm">Breadth (cm)</label><input className="input" type="number" min="0.1" step="0.1" id="breadthCm" name="breadthCm" defaultValue="20" required /></div><div className="field"><label htmlFor="heightCm">Height (cm)</label><input className="input" type="number" min="0.1" step="0.1" id="heightCm" name="heightCm" defaultValue="15" required /></div></div></div>
    <div className="form-grid"><div className="field"><label htmlFor="actualWeightKg">Actual weight (kg)</label><input className="input" type="number" min="0.1" step="0.1" id="actualWeightKg" name="actualWeightKg" defaultValue="2" required /></div><div className="field"><label htmlFor="declaredValue">Declared value (₹)</label><input className="input" type="number" min="0" step="1" id="declaredValue" name="declaredValue" defaultValue="1000" /></div></div>
    <div className="form-grid"><div className="field"><label htmlFor="orderType">Order type</label><select className="select" id="orderType" name="orderType"><option>B2C</option><option>B2B</option></select></div><div className="field"><label htmlFor="paymentType">Payment</label><select className="select" id="paymentType" name="paymentType"><option value="PREPAID">Prepaid</option><option value="COD">Cash on delivery</option></select></div></div>
    <div className="field"><label htmlFor="deliveryNotes">Delivery notes (optional)</label><textarea className="textarea" id="deliveryNotes" name="deliveryNotes" placeholder="Landmark, handling instructions, preferred time…" /></div>
    {error && <div className="form-error">{error}</div>}
    <button className="button" disabled={busy}>{busy ? "Calculating…" : "Calculate charge →"}</button>
  </div></form><aside>{quote ? <div className="quote-panel"><div className="eyebrow" style={{ color: "var(--lime)" }}>Your confirmed quote</div><div className="quote-total">₹{quote.totalCharge.toFixed(2)}</div><div className="quote-row"><span>Route</span><strong>{quote.pickupZone} → {quote.dropZone}</strong></div><div className="quote-row"><span>Volumetric weight</span><strong>{quote.volumetricWeightKg} kg</strong></div><div className="quote-row"><span>Billable weight</span><strong>{quote.billableWeightKg} kg</strong></div><div className="quote-row"><span>Freight</span><strong>₹{quote.baseCharge.toFixed(2)}</strong></div><div className="quote-row"><span>COD surcharge</span><strong>₹{quote.codSurcharge.toFixed(2)}</strong></div><div style={{ borderTop: "1px solid #40524c", margin: "16px 0" }} /><p style={{ color: "#b9c7c2", fontSize: 12, lineHeight: 1.6 }}>Calculated from the configured rate card. The higher of actual and volumetric weight is billed.</p><button className="button" style={{ width: "100%", background: "var(--lime)", color: "var(--ink)", marginTop: 12 }} onClick={confirm} disabled={busy}>{busy ? "Creating order…" : "Confirm & book delivery"}</button></div> : <div className="card"><div className="empty"><div style={{ fontSize: 34, marginBottom: 12 }}>₹</div>Complete the package details to see a transparent, itemised quote before booking.</div></div>}</aside></div>;
}
