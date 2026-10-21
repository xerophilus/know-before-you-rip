"use client";
import { useMemo, useState } from "react";
import { type Chase } from "@/lib/data";
export default function ChaseTable({ chases }: { chases: Chase[] }) {
  const [q, setQ] = useState(""),
    [rarity, setRarity] = useState("all"),
    [status, setStatus] = useState("all");
  const filtered = useMemo(
    () =>
      chases.filter(
        (c) =>
          (c.player + " " + c.card + " " + c.parallel)
            .toLowerCase()
            .includes(q.toLowerCase()) &&
          (rarity === "all" || String(c.printRun) === rarity) &&
          (status === "all" || c.status === status),
      ),
    [q, rarity, status, chases],
  );
  return (
    <>
      <div className="grid" style={{ marginBottom: 18 }}>
        <input
          aria-label="Search players and cards"
          className="search"
          placeholder="Search players and cards…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="field">
          <select
            aria-label="Rarity"
            value={rarity}
            onChange={(e) => setRarity(e.target.value)}
          >
            <option value="all">All serial tiers</option>
            <option value="1">1/1</option>
            <option value="5">/5</option>
            <option value="25">/25</option>
          </select>
        </div>
        <div className="field">
          <select
            aria-label="Evidence status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All evidence statuses</option>
            <option value="documented">Documented sightings</option>
            <option value="unverified">Not verified</option>
          </select>
        </div>
      </div>
      <div className="tableWrap">
        <table className="dataTable">
          <thead>
            <tr>
              <th>Player / card identity</th>
              <th>Parallel</th>
              <th>Print run</th>
              <th>Sightings</th>
              <th>Sighting evidence</th>
              <th>Checklist provenance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.player}</strong>
                  <div className="muted small" style={{ marginTop: 5 }}>
                    {c.card}
                  </div>
                </td>
                <td>{c.parallel}</td>
                <td>
                  <strong>{c.printRun === 1 ? "1/1" : "/" + c.printRun}</strong>
                </td>
                <td>
                  <span
                    className={
                      "tag " + (c.status === "documented" ? "green" : "")
                    }
                  >
                    {c.status === "documented"
                      ? `${c.copiesSeen} documented`
                      : "Unverified"}
                  </span>
                </td>
                <td>
                  {c.evidence.length ? (
                    c.evidence.map((e) => (
                      <a
                        key={e.url}
                        className="sources"
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {e.label}
                      </a>
                    ))
                  ) : (
                    <span className="muted small">No validated sighting</span>
                  )}
                </td>
                <td>
                  {c.checklistSources?.length ? (
                    c.checklistSources.map((s) => (
                      <div key={s.url + s.label}>
                        <a
                          className="sources"
                          href={s.url}
                          title={`SHA-256: ${s.sha256}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {s.label}
                        </a>
                      </div>
                    ))
                  ) : (
                    <span className="muted small">Not imported</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small">
        {filtered.length} tracked targets shown. Only numbered variants are
        shown. “Unverified” does not mean unpulled or still inside a box. The
        official manufacturer checklist can be opened on the release page.
      </p>
    </>
  );
}
