# Know Before You Rip

Next.js / TypeScript sports-card MVP. Sealed-box ROI and the **experimental hypothetical rip scenario** remain available. The original app did not implement probability-weighted EV; this update deliberately does not manufacture one.

## Run locally

Use Node 22.13+ (Node 22 LTS), then:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. With no Supabase configuration, the existing product preview/calculator works, the chase table explicitly labels its original targets as unvalidated, and evidence writes are unavailable. No credentials are included.

```sh
npm test
npm run typecheck
npm run build
```

Tests execute the migration and permission checks against embedded PostgreSQL (PGlite), with a minimal simulated Supabase auth schema. They also cover CSV/PDF extraction, serial normalization, API failure behavior, marketplace discovery, and calculator math. This does **not** replace a hosted Supabase/Auth/PostgREST smoke test.

## Supabase setup

1. Create a **new development Supabase project**. Never apply this initial migration over similarly named tables without first checking the schema.
2. Apply each file in `supabase/migrations/` in filename order in its SQL editor, each as one transaction (`BEGIN;` before the file, `COMMIT;` after it). Alternatively, initialize/link the pinned Supabase CLI, inspect `supabase db push --help`, and deploy the migration through your normal CLI migration process. Do not mix manual application and CLI history without reconciling migration history.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and the **server-only** `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Restart/rebuild after changing public variables. The service key is never sent to the browser.
4. In Supabase Auth create confirmed development email/password accounts (or invite users and complete their password setup). `/evidence` and `/admin` use password sign-in. Self-service registration/password recovery screens are outside this increment. Disable anonymous sign-in; the API and insert policy also reject anonymous sessions.
5. Assign a reviewer explicitly in the SQL editor using the account's real UUID:

```sql
insert into public.admin_roles(user_id) values ('REPLACE_WITH_AUTH_USER_UUID');
```

Do not put reviewer status in editable user metadata. No browser role can insert/update reviewer assignments. Remove the row to revoke reviewer access immediately for subsequent review requests.

6. Confirm Data API exposure for `public`, and run the Supabase security/performance advisors. The migration explicitly revokes default privileges, enables RLS on every table, grants required access, and uses security-invoker views/functions.
7. Query `select id, slug from public.releases;` for the release UUID used in an import. Only the requested release name is seeded. Cards, odds, market values and sightings are **not** seeded.

The public catalog reads reviewed checklist variants and counts distinct copies with at least one currently approved sighting. A removed/revoked sighting stops contributing immediately. Canonical copy rows can remain for audit but are hidden publicly if they have no approved sightings.

## Checklist ingestion (official CSV or PDF)

Download the original document from the manufacturer yourself and retain it. The ingestion command reads local files only; the web server never fetches arbitrary submitted URLs. A reviewer must verify publisher authenticity—an HTTPS URL or a hash alone does not prove a source is official.

Prepare `metadata.json`:

```json
{
  "releaseId": "REPLACE_WITH_RELEASE_UUID",
  "sourceUrl": "https://manufacturer.example/path/to/original-document",
  "publisher": "REPLACE_WITH_MANUFACTURER"
}
```

The example hostname above is a placeholder, not a real source. Do not upload it as production evidence.

Canonical CSV columns:

```csv
set,card_number,subject,parallel,print_run
```

One row represents one explicit card/parallel combination. Blank `print_run` means **unknown or unnumbered**, not zero. Never expand a generic parallel list across every card unless the official document explicitly supports that combination. Never infer odds from print runs.

```sh
npm run ingest -- /path/to/original.csv /path/to/metadata.json /path/to/prepared.json
```

For manufacturer CSVs with different columns, prepare a separate mapping CSV using the canonical columns plus `locator` (`record:1` is the first data record after the header). Preserve the original file as the first argument:

```sh
npm run ingest -- /path/to/original.csv /path/to/metadata.json /path/to/prepared.json /path/to/reviewed-mapping.csv
```

For PDFs, extract first:

```sh
npm run ingest -- /path/to/original.pdf /path/to/metadata.json /path/to/extraction.json
```

Inspect the original PDF visually, then create a mapping CSV with canonical columns and a `locator` such as `page:3` or `page:3 table Rookie Autographs`. Extraction alone is deliberately not publishable. Scanned/image-only PDFs fail closed and need OCR plus manual verification before a supported text source can be processed. There is no guessed universal PDF table parser.

```sh
npm run ingest -- /path/to/original.pdf /path/to/metadata.json /path/to/prepared.json /path/to/reviewed-mapping.csv
```

The command preserves original bytes in a sibling `source-archive/<sha256>.<ext>` directory, computes SHA-256, extracts text with page/record locators, validates identities and positive print runs, and rejects duplicate variants. Keep the source archive in protected persistent storage with backups; it is intentionally not committed or uploaded by the browser. The database retains the source URL, hash, filename, captured timestamp, extracted text, imported rows, provenance links and reviewer publication metadata. This timestamp records ingestion, not the manufacturer's publication date.

In `/admin`: sign in → Load / refresh → upload prepared JSON → inspect mapped rows/extraction and original document → confirm official source and transcription → publish. Staging changes no public card records. Publication is transactional. Conflicting subjects/print runs abort the entire import; corrections require a deliberate data migration, not a silent overwrite. Equivalent case/outer whitespace in set/card/parallel keys resolves to the same identity; aliases and different spellings require reviewer normalization. Source hashes are unique within a release; a rejected mapping should be corrected before upload or replaced by an audited administrator operation (there is no staged-import editor yet).

## Evidence workflow

1. A signed-in collector chooses a published numbered parallel and submits an HTTPS source URL, visible serial stamp, observation time, locator and optional note. No server-side image download is performed.
2. Submission starts pending. Collectors can read their own submissions; reviewers can read the queue. No ordinary user can change review state or create canonical copies/sightings.
3. In `/admin`, open the source, verify card/set/parallel and the visible serial, record a reason, and approve or reject. Approval atomically creates/reuses `(parallel_id, serial_number)`, creates a sighting and appends a review event.
4. Different listings/photos of the same numbered copy count once. A repeat submission by the same user for the same exact source/copy is rejected. Marketplace relists can remain separate evidence records but cannot inflate copy counts.
5. Approved evidence can be revoked with a reason. The audit remains. Rejected/revoked submissions are terminal; use a new source for new evidence rather than editing history.

Unknown serials, unreadable stamps and unnumbered cards cannot establish a unique serialized copy. A checklist proves existence, not a pull. An observed copy does not establish current ownership, sold price, remaining inventory or adjusted pack probability. Evidence URLs may disappear; the current increment does not archive screenshots or license third-party imagery.

## Marketplace discovery scaffold

`GET /api/discovery?q=...` is reviewer-only and disabled by default. The adapter calls the official **eBay Browse API** with an application access token; no scraping, seller login automation or sold-listing assumptions.

- Keep `EBAY_DISCOVERY_ENABLED=false` until authorized access is available.
- Obtain an application token using eBay's supported OAuth client-credentials process. Provision `EBAY_APPLICATION_TOKEN` server-side and renew it externally before expiry; automatic token refresh is not implemented.
- Default `EBAY_ENVIRONMENT=sandbox`. Set `production` only after confirming your app's access and usage/display/retention obligations.
- Enable discovery explicitly. Searches make one request for at most 20 candidates; timeout/rate-limit failures stop the request. No background polling, automatic retries, persistent listing cache, price history or automatic evidence approval is implemented.
- Results are transient unreviewed candidates, with environment, provider ID, source URL, discovery time and optional **asking price**. Sandbox results are labeled. Manually verify real evidence before submission; never publish synthetic sandbox results.
- Discovery is limited to 30 searches per reviewer per hour and 1,000 per day across all reviewers (see *Rate limits*). Before scaling, add token lifecycle management and a documented retention/deletion policy appropriate to approved API terms.

Reference: https://developer.ebay.com/develop/api/buy (Browse API and application tokens).

## Rate limits

Every API request is counted in Postgres (`public.rate_limits`, server-only), so limits hold across all server instances. Limits are set in `lib/server/supabase.ts`:

| Bucket | Limit |
| --- | --- |
| Any API request with a bearer token, per client IP | 120 per minute |
| Evidence submissions, per account | 30 per hour |
| Review decisions, per reviewer | 300 per hour |
| Checklist stage/publish, per reviewer | 20 per hour |
| Marketplace discovery, per reviewer / all reviewers | 30 per hour / 1,000 per day |

Exceeding a limit returns HTTP 429. If the limiter can't reach the database, requests fail closed with a 500. Password sign-in goes straight to Supabase Auth, so its brute-force protection comes from Supabase's own Auth rate limits (Authentication → Rate Limits in the dashboard), not from this table.

## Deployment and limitations

See [docs/deployment.md](docs/deployment.md) for the incremental release plan and [docs/data-model.md](docs/data-model.md) for schema/security details. No hosted Supabase project, official checklist import, live marketplace credential or deployment was configured during this implementation. The existing prototype's product specs/prices remain visibly unverified rather than being relabeled as researched facts.
