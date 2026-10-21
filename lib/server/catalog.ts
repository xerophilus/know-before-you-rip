import { configured, userDb } from "./supabase";
import { chases, type Chase } from "../data";
export async function loadCatalog(
  slug?: string,
): Promise<{ chases: Chase[]; notice: string }> {
  if (!configured())
    return {
      chases,
      notice:
        "Preview targets from the original prototype; checklist identities have not been validated by the new import workflow. No confirmed sightings are claimed.",
    };
  const db = userDb();
  let query = db.from("catalog").select("*").order("subject").limit(1000);
  if (slug) query = query.eq("release_slug", slug);
  const [catalog, copies, provenance] = await Promise.all([
    query,
    db
      .from("serialized_copies")
      .select("id,parallel_id,serial_number,sightings(source_url,locator)")
      .limit(10000),
    db
      .from("checklist_provenance")
      .select(
        "parallel_id,locator,source_documents(source_url,publisher,sha256)",
      )
      .limit(10000),
  ]);
  if (catalog.error || copies.error || provenance.error)
    return {
      chases: [],
      notice:
        "The reviewed catalog or evidence is temporarily unavailable. No sighting count can be inferred from this error.",
    };
  return {
    notice:
      "Published checklist variants with reviewed, distinct numbered-copy sightings. Counts describe observed copies, not remaining inventory or pack odds. Up to 1,000 variants are displayed; evidence links are a limited display sample.",
    chases: (catalog.data ?? [])
      .filter((row) => row.print_run !== null)
      .map((row) => {
        const matching = (copies.data ?? []).filter(
          (c) => c.parallel_id === row.id,
        );
        return {
          id: row.id,
          player: row.subject,
          card: `${row.set_name} · ${row.card_number}`,
          parallel: row.parallel,
          printRun: row.print_run,
          status: row.copies_seen > 0 ? "documented" : "unverified",
          copiesSeen: row.copies_seen,
          serials: matching.map((c) => `${c.serial_number}/${row.print_run}`),
          evidence: matching.flatMap((c) =>
            c.sightings.map((s) => ({
              label: `${c.serial_number}/${row.print_run} · ${s.locator}`,
              url: s.source_url,
              type: "report" as const,
            })),
          ),
          checklistSources: (provenance.data ?? [])
            .filter((p) => p.parallel_id === row.id)
            .map((p) => {
              const source = p.source_documents as unknown as {
                source_url: string;
                publisher: string;
                sha256: string;
              };
              return {
                url: source.source_url,
                label: `${source.publisher} · ${p.locator}`,
                sha256: source.sha256,
              };
            }),
        };
      }),
  };
}
