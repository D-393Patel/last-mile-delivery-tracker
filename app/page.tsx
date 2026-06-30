import Link from "next/link";
import { Logo } from "@/components/logo";
import { TrackingSearch } from "@/components/tracking-search";

export default function Home() {
  return (
    <>
      <header className="shell topbar">
        <Logo />
        <nav className="nav-actions">
          <a className="nav-link" href="#capabilities">Capabilities</a>
          <a className="nav-link" href="#track">Track</a>
          <Link className="button secondary small" href="/login">Sign in</Link>
          <Link className="button small" href="/register">Create account</Link>
        </nav>
      </header>

      <main>
        <section className="shell hero">
          <div>
            <div className="eyebrow">The intelligent delivery desk</div>
            <h1>Every parcel.<br />Perfectly placed.</h1>
            <p className="hero-copy">Transparent zone-based pricing, smart agent dispatch, and a live timeline that keeps operations teams and customers moving together.</p>
            <div className="hero-actions">
              <Link href="/register" className="button">Book a delivery <span>→</span></Link>
              <a href="#track" className="button secondary">Track an order</a>
            </div>
          </div>
          <div className="hero-card" aria-label="Sample route quote">
            <div className="route-card">
              <div className="eyebrow">Live route estimate</div>
              <div className="route-row"><span className="route-dot" /><div><div className="route-label">PICKUP</div><div className="route-value">Ahmedabad Central</div></div><span>09:30</span></div>
              <div className="route-line" />
              <div className="route-row"><span className="route-dot end" /><div><div className="route-label">DROP</div><div className="route-value">Gandhinagar North</div></div><span>13:45</span></div>
              <div className="price-tag"><div><div className="route-label">CALCULATED FARE</div><div className="price">₹148.00</div></div><span className="status assigned">Agent matched</span></div>
            </div>
          </div>
        </section>

        <section className="feature-band" id="capabilities">
          <div className="shell">
            <div className="section-head"><div><div className="eyebrow">Built for the final mile</div><h2>Control without complexity.</h2></div><p>One operational view connects pricing, dispatch, delivery attempts, and customer communication.</p></div>
            <div className="feature-grid">
              <article className="feature-card"><div className="feature-icon">₹</div><h3>Explainable pricing</h3><p>Volumetric weight, B2B/B2C rate cards, inter-zone rules, and COD fees are calculated before confirmation.</p></article>
              <article className="feature-card"><div className="feature-icon">⌖</div><h3>Capacity-aware dispatch</h3><p>Orders are ranked by service zone, live distance, agent availability, and active workload.</p></article>
              <article className="feature-card"><div className="feature-icon">✓</div><h3>Reliable tracking</h3><p>Every status change is preserved with its timestamp and actor, producing an immutable audit trail.</p></article>
            </div>
          </div>
        </section>

        <section className="shell track-section" id="track">
          <div className="track-box">
            <div className="track-copy"><div className="eyebrow" style={{ color: "var(--lime)" }}>No account needed</div><h2>Where is your delivery?</h2><p>Enter the tracking number from your confirmation email to see the current milestone and journey.</p></div>
            <div className="track-form-wrap"><TrackingSearch /></div>
          </div>
        </section>
      </main>
      <footer><div className="shell">© 2026 Dispatch · Last-mile operations, clearly delivered.</div></footer>
    </>
  );
}
