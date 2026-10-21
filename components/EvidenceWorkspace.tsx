"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
type Variant = {
  id: string;
  subject: string;
  card_number: string;
  set_name: string;
  parallel: string;
  print_run: number | null;
  release_slug: string;
};
type Submission = {
  id: string;
  parallel_id: string;
  serial_number: number;
  source_url: string;
  locator: string;
  note: string;
  status: string;
  observed_at: string;
};
type Import = {
  id: string;
  status: string;
  rows: unknown[];
  source_documents: {
    source_url: string;
    publisher: string;
    filename: string;
    sha256: string;
    extracted: { locator: string; text: string }[];
  };
};
export default function EvidenceWorkspace({
  admin = false,
}: {
  admin?: boolean;
}) {
  const [db, setDb] = useState<SupabaseClient | null>(null),
    [token, setToken] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [variants, setVariants] = useState<Variant[]>([]),
    [entries, setEntries] = useState<Submission[]>([]),
    [imports, setImports] = useState<Import[]>([]);
  const [parallelId, setParallelId] = useState(""),
    [serial, setSerial] = useState(""),
    [sourceUrl, setSourceUrl] = useState(""),
    [locator, setLocator] = useState(""),
    [note, setNote] = useState(""),
    [date, setDate] = useState("");
  const [reviewId, setReviewId] = useState(""),
    [reason, setReason] = useState(""),
    [identity, setIdentity] = useState(false),
    [stamp, setStamp] = useState(false);
  const [official, setOfficial] = useState(false),
    [transcription, setTranscription] = useState(false),
    [importId, setImportId] = useState(""),
    [search, setSearch] = useState(""),
    [discovery, setDiscovery] = useState("");
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
      key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    const client = createClient(url, key);
    setDb(client);
    client.auth
      .getSession()
      .then(({ data }) => setToken(data.session?.access_token ?? ""));
    const { data } = client.auth.onAuthStateChange((event, session) => {
      setToken(session?.access_token ?? "");
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        setEntries([]);
        setImports([]);
        setReviewId("");
        setImportId("");
        setDiscovery("");
      }
    });
    client
      .from("catalog")
      .select("*")
      .order("subject")
      .then(({ data, error }) => {
        if (error) setMessage("Could not load the reviewed checklist");
        else setVariants(data ?? []);
      });
    return () => data.subscription.unsubscribe();
  }, []);
  async function api(path: string, method = "GET", payload?: unknown) {
    const response = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Request failed");
    return result;
  }
  async function refresh() {
    setEntries(await api("/api/evidence"));
    if (admin) setImports(await api("/api/imports"));
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const variantLabel = (id: string) => {
    const v = variants.find((v) => v.id === id);
    return v
      ? `${v.release_slug} · ${v.set_name} · ${v.card_number} · ${v.subject} · ${v.parallel} /${v.print_run ?? "unnumbered"}`
      : id;
  };
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    return (
      <div className="notice">
        Evidence service is not connected yet. Follow the Supabase setup in the
        project README. No submissions have been stored.
      </div>
    );
  return (
    <div className="card">
      <p role="status" aria-live="polite">
        {message}
      </p>
      {!token ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const result = await db!.auth.signInWithPassword({
                email,
                password,
              });
              if (result.error) throw result.error;
              setPassword("");
            });
          }}
        >
          <h2>Sign in</h2>
          <p>
            Use your invited account. Reviewer access is assigned separately by
            the project owner.
          </p>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="btn" disabled={busy}>
            Sign in
          </button>
        </form>
      ) : (
        <>
          <div className="row">
            <button
              className="btn secondary"
              disabled={busy}
              onClick={() => run(refresh)}
            >
              Load / refresh {admin ? "review queue" : "my submissions"}
            </button>
            <button
              className="btn secondary"
              onClick={() =>
                run(async () => {
                  await db!.auth.signOut();
                  setEntries([]);
                  setImports([]);
                })
              }
            >
              Sign out
            </button>
          </div>
          {!admin && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  await api("/api/evidence", "POST", {
                    parallelId,
                    serial,
                    sourceUrl,
                    locator,
                    note,
                    observedAt: new Date(date).toISOString(),
                  });
                  await refresh();
                  setMessage(
                    "Submitted for review. This is not a confirmed sighting yet.",
                  );
                });
              }}
            >
              <h2>Submit a numbered-copy sighting</h2>
              <p>
                Provide a publicly accessible source showing the exact card,
                parallel and serial stamp. Do not submit private personal
                information. Unknown serials cannot establish a unique copy.
              </p>
              <div className="field">
                <label htmlFor="variant">Reviewed checklist variant</label>
                <select
                  id="variant"
                  required
                  value={parallelId}
                  onChange={(e) => setParallelId(e.target.value)}
                >
                  <option value="">Choose a variant</option>
                  {variants
                    .filter((v) => v.print_run !== null)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {variantLabel(v.id)}
                      </option>
                    ))}
                </select>
              </div>
              {!variants.length && (
                <p className="notice">
                  No official checklist variants have been published yet. A
                  reviewer must import and verify a checklist first.
                </p>
              )}
              <div className="cols2">
                <div className="field">
                  <label htmlFor="serial">
                    Visible serial stamp (e.g. 03/25)
                  </label>
                  <input
                    id="serial"
                    required
                    maxLength={40}
                    value={serial}
                    onChange={(e) => setSerial(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="observed">
                    When you observed the evidence
                  </label>
                  <input
                    id="observed"
                    type="datetime-local"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="source">Evidence URL (HTTPS)</label>
                <input
                  id="source"
                  type="url"
                  required
                  maxLength={2048}
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="locator">
                  Where the identity and serial are visible (photo / timestamp)
                </label>
                <input
                  id="locator"
                  required
                  minLength={3}
                  maxLength={500}
                  value={locator}
                  onChange={(e) => setLocator(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="note">Notes for the reviewer</label>
                <textarea
                  id="note"
                  maxLength={2000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <button className="btn" disabled={busy}>
                Submit evidence
              </button>
            </form>
          )}
          <h2>{admin ? "Review queue" : "My submissions"}</h2>
          <p>
            Use Load / refresh to retrieve the latest status. Reviewed sightings
            indicate observed copies, never the number remaining in sealed
            boxes.
          </p>
          {entries.map((entry) => (
            <article
              className="card"
              key={entry.id}
              style={{ marginBottom: 12 }}
            >
              <strong>{variantLabel(entry.parallel_id)}</strong>
              <p>
                Serial #{entry.serial_number} · {entry.status} · observed{" "}
                {new Date(entry.observed_at).toLocaleString()}
              </p>
              <a
                className="sources"
                href={entry.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open submitted source ↗
              </a>
              <p>{entry.locator}</p>
              <p>{entry.note}</p>
              {admin && ["pending", "approved"].includes(entry.status) && (
                <button
                  className="btn secondary"
                  onClick={() => {
                    setReviewId(entry.id);
                    setIdentity(false);
                    setStamp(false);
                    setReason("");
                  }}
                >
                  Review this submission
                </button>
              )}
            </article>
          ))}
          {admin && reviewId && (
            <form onSubmit={(e) => e.preventDefault()} className="card">
              <h3>Review {reviewId}</h3>
              <p>
                Open the source and compare against the published checklist.
                Reject unreadable serials, mismatched variants, digital mockups
                and unsupported claims.
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={identity}
                  onChange={(e) => setIdentity(e.target.checked)}
                />{" "}
                Exact card and parallel match
              </label>
              <br />
              <label>
                <input
                  type="checkbox"
                  checked={stamp}
                  onChange={(e) => setStamp(e.target.checked)}
                />{" "}
                Serial stamp is visible and matches
              </label>
              <div className="field">
                <label htmlFor="reason">
                  Review reason (at least 10 characters)
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  minLength={10}
                  maxLength={2000}
                />
              </div>
              {(entries.find((e) => e.id === reviewId)?.status === "approved"
                ? ["revoked"]
                : ["approved", "rejected"]
              ).map((decision) => (
                <button
                  key={decision}
                  className="btn secondary"
                  disabled={
                    busy ||
                    reason.trim().length < 10 ||
                    (decision === "approved" && (!identity || !stamp))
                  }
                  onClick={() =>
                    run(async () => {
                      await api("/api/review", "POST", {
                        id: reviewId,
                        decision,
                        reason,
                        identityConfirmed: identity,
                        serialConfirmed: stamp,
                      });
                      setReviewId("");
                      await refresh();
                      setMessage("Review saved.");
                    })
                  }
                >
                  {decision === "revoked"
                    ? "Revoke sighting"
                    : decision === "approved"
                      ? "Approve sighting"
                      : "Reject submission"}
                </button>
              ))}
            </form>
          )}
          {admin && (
            <>
              <div className="divider" />
              <h2>Official checklist imports</h2>
              <p>
                Prepare CSV or PDF with the ingestion command in the README.
                Upload the prepared JSON to stage it. Verify the publisher,
                original source and every mapped row before publication.
              </p>
              <label htmlFor="import-file">Prepared checklist JSON</label>
              <input
                id="import-file"
                type="file"
                accept=".json"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    run(async () => {
                      if (file.size > 4000000)
                        throw new Error("File exceeds 4 MB");
                      await api(
                        "/api/imports",
                        "POST",
                        JSON.parse(await file.text()),
                      );
                      await refresh();
                      setMessage("Import staged; review it before publishing.");
                    });
                }}
              />
              {imports.map((batch) => (
                <article className="card" key={batch.id}>
                  <h3>
                    {batch.source_documents.filename} · {batch.status}
                  </h3>
                  <a
                    className="sources"
                    href={batch.source_documents.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Original source ↗
                  </a>
                  <p>
                    {batch.source_documents.publisher} · {batch.rows.length}{" "}
                    rows
                  </p>
                  <p className="small" style={{ overflowWrap: "anywhere" }}>
                    SHA-256: {batch.source_documents.sha256}
                  </p>
                  <details>
                    <summary>Inspect mapped rows and extracted text</summary>
                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        maxHeight: 400,
                        overflow: "auto",
                      }}
                    >
                      {JSON.stringify(
                        {
                          rows: batch.rows,
                          extracted: batch.source_documents.extracted,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                  {batch.status === "staged" && (
                    <button
                      className="btn secondary"
                      onClick={() => {
                        setImportId(batch.id);
                        setOfficial(false);
                        setTranscription(false);
                      }}
                    >
                      Select for publication
                    </button>
                  )}
                </article>
              ))}
              {importId && (
                <div className="card">
                  <p>Selected import: {importId}</p>
                  <label>
                    <input
                      type="checkbox"
                      checked={official}
                      onChange={(e) => setOfficial(e.target.checked)}
                    />{" "}
                    I verified that the original document is an official
                    manufacturer source.
                  </label>
                  <br />
                  <label>
                    <input
                      type="checkbox"
                      checked={transcription}
                      onChange={(e) => setTranscription(e.target.checked)}
                    />{" "}
                    I checked all identities, parallel print runs and source
                    locators against the original.
                  </label>
                  <br />
                  <button
                    className="btn"
                    disabled={busy || !official || !transcription}
                    onClick={() =>
                      run(async () => {
                        await api("/api/imports", "PATCH", {
                          id: importId,
                          officialSourceConfirmed: official,
                          transcriptionConfirmed: transcription,
                        });
                        setImportId("");
                        await refresh();
                        setMessage(
                          "Checklist published. Reload the page to update variant options.",
                        );
                      })
                    }
                  >
                    Publish reviewed checklist
                  </button>
                </div>
              )}
              <div className="divider" />
              <h2>Marketplace discovery scaffold</h2>
              <p>
                Authorized eBay Browse API only. Disabled by default. Results
                are unreviewed listing candidates, with no automatic evidence
                approval or price-model updates.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () =>
                    setDiscovery(
                      JSON.stringify(
                        await api(
                          `/api/discovery?q=${encodeURIComponent(search)}`,
                        ),
                        null,
                        2,
                      ),
                    ),
                  );
                }}
              >
                <div className="field">
                  <label htmlFor="query">Listing search</label>
                  <input
                    id="query"
                    required
                    maxLength={200}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button className="btn secondary" disabled={busy}>
                  Discover candidates
                </button>
              </form>
              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {discovery}
              </pre>
            </>
          )}
        </>
      )}
    </div>
  );
}
