import EvidenceWorkspace from "@/components/EvidenceWorkspace";
export default function AdminPage() {
  return (
    <section className="section">
      <h1>Evidence review</h1>
      <p>
        Reviewer-only actions are authorized on the server. Signing in does not
        grant reviewer access.
      </p>
      <EvidenceWorkspace admin />
    </section>
  );
}
