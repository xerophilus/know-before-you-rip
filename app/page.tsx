import Link from "next/link";
import { ArrowRight, ShieldCheck, TrendingUp, ScanSearch } from "lucide-react";
import ProductArt from "@/components/ProductArt";
import { releases, usd } from "@/lib/data";
export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">Evidence first. Hype last.</div>
        <h1>
          Know the odds.
          <br />
          <span style={{ color: "var(--accent)" }}>Before the rip.</span>
        </h1>
        <p className="lead">
          Compare sealed resale economics, explore documented chase sightings,
          and stress-test the value of opening a box. No mystery scores or
          invented odds.
        </p>
        <Link
          className="btn"
          href="/releases/2025-26-topps-chrome-black-basketball"
        >
          Analyze a box <ArrowRight size={17} />
        </Link>
      </section>
      <section className="section">
        <div className="grid">
          {[
            {
              icon: <ScanSearch />,
              title: "Release intelligence",
              body: "Manufacturer specs and checklists with clear attribution.",
            },
            {
              icon: <ShieldCheck />,
              title: "Evidence-backed chases",
              body: "Exact variant identities and sightings with source verification.",
            },
            {
              icon: <TrendingUp />,
              title: "Decision models",
              body: "Transparent break-even math and adjustable opening scenarios.",
            },
          ].map((f) => (
            <div className="card" key={f.title}>
              <div style={{ color: "var(--accent)", marginBottom: 12 }}>
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="subhead">
          <div>
            <div className="eyebrow">Release directory</div>
            <h2>Explore releases</h2>
          </div>
          <span className="tag green">1 supported release</span>
        </div>
        <div className="grid">
          {releases.map((r) => (
            <Link
              className="card card-hover"
              key={r.slug}
              href={"/releases/" + r.slug}
            >
              <ProductArt />
              <div style={{ marginTop: 19 }}>
                <span className="tag green">{r.coverage}</span>
                <h3 style={{ marginTop: 12 }}>{r.title}</h3>
                <p className="small">
                  {r.format} · {r.cardCount} cards · {r.autoCount} encased
                  autograph
                </p>
                <div className="row" style={{ marginTop: 20 }}>
                  <span className="muted small">
                    Prototype MSRP (unverified) {usd(r.msrp)}
                  </span>
                  <ArrowRight size={18} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="notice">
          MVP transparency: original prototype specifications link to
          manufacturer sources and await verification in the import workflow.
          Market prices are entered by users; the app has no live eBay feed.
          Unverified chases are not assumed to remain in sealed boxes.
        </div>
      </section>
    </>
  );
}
