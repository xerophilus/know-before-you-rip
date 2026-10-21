import { loadCatalog } from "@/lib/server/catalog";
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { releases, usd } from "@/lib/data";
import ProductArt from "@/components/ProductArt";
import FinancialCalculator from "@/components/FinancialCalculator";
import ChaseTable from "@/components/ChaseTable";
export default async function ReleasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = releases.find((x) => x.slug === slug);
  if (!r) notFound();
  const catalog = await loadCatalog(slug);
  return (
    <>
      <section className="hero" style={{ paddingBottom: 10 }}>
        <Link href="/" className="muted small">
          ← All releases
        </Link>
        <div className="eyebrow" style={{ marginTop: 24 }}>
          Release intelligence · {r.sport}
        </div>
        <h1 style={{ fontSize: "clamp(36px,5vw,58px)" }}>{r.title}</h1>
        <p className="lead">{r.summary}</p>
        <span className="tag green">
          Prototype product details · verify at source
        </span>
      </section>
      <div className="cols2 section">
        <ProductArt />
        <div className="card">
          <h2>Box configuration</h2>
          <div className="divider" />
          {[
            ["Format", r.format],
            ["Cards per box", String(r.cardCount)],
            ["Packs", String(r.packs)],
            ["Encased autograph", String(r.autoCount) + " per box"],
            ["Original prototype MSRP (unverified)", usd(r.msrp)],
          ].map(([k, v]) => (
            <div key={k} className="row" style={{ marginBottom: 18 }}>
              <span className="muted">{k}</span>
              <strong>{v}</strong>
            </div>
          ))}
          <div className="divider" />
          <a
            className="sources"
            href={r.productUrl}
            target="_blank"
            rel="noreferrer"
          >
            Manufacturer product page ↗
          </a>
          <div style={{ marginTop: 10 }}>
            <a
              className="sources"
              href={r.checklistUrl}
              target="_blank"
              rel="noreferrer"
            >
              Official PDF checklist ↗
            </a>
          </div>
        </div>
      </div>
      <section className="section">
        <FinancialCalculator />
      </section>
      <section className="section">
        <div className="subhead">
          <div>
            <div className="eyebrow">Chase register</div>
            <h2>High-end targets</h2>
          </div>
          <Link href="/chases" className="sources">
            Open full tracker →
          </Link>
        </div>
        <div className="card">
          <p className="notice">{catalog.notice}</p>
          <ChaseTable chases={catalog.chases} />
        </div>
      </section>
    </>
  );
}
