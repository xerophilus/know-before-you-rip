import { loadCatalog } from "@/lib/server/catalog";
export const dynamic = "force-dynamic";
import ChaseTable from "@/components/ChaseTable";
export default async function Chases() {
  const catalog = await loadCatalog();
  return (
    <>
      <section className="hero" style={{ paddingBottom: 15 }}>
        <div className="eyebrow">Exact variant registry</div>
        <h1>Chase sightings</h1>
        <p className="lead">
          Separate card existence from actual sightings. Each confirmed serial
          requires a verifiable evidence record.
        </p>
      </section>
      <section className="section">
        <div className="notice" style={{ marginBottom: 20 }}>
          {catalog.notice}
        </div>
        <div className="card">
          <ChaseTable chases={catalog.chases} />
        </div>
      </section>
    </>
  );
}
