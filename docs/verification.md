# Verification record — 2026-10-21

Story: collectors submit evidence through the UI/API, reviewers validate it against the official catalog, and only approved unique numbered copies appear in public counts.

| Boundary | Result | Evidence |
| --- | --- | --- |
| SQL migration / data integrity | Passed | Migration runs on embedded PostgreSQL; publication, rollback, uniqueness, denominator checks, review history and revocation tests pass. |
| Authorization | Passed in database/unit tests | Anonymous/private access denied; collector ownership enforced; direct status/role mutation denied; privileged RPC execution denied to ordinary roles. |
| CSV and PDF processing | Passed | Quoted CSV fields, invalid denominators, duplicate rows, source hashes, malformed PDFs, and a valid synthetic text PDF with page locator tested. |
| Marketplace scaffold | Passed with mocked provider | Disabled means no request; active listing is an unreviewed candidate with asking price; missing credentials and rate limits fail. |
| Calculators | Passed | Sealed proceeds/break-even and hypothetical rip proceeds tested; nonfinite inputs are handled. |
| Build and type checking | Passed | Next.js production build and TypeScript checks pass. |
| HTTP pages | Passed without Supabase | `/`, `/chases`, `/evidence`, `/admin`, and the initial release return HTTP 200. |
| Unconfigured API | Passed | POST `/api/evidence` returns 503 with `Evidence service is not configured yet`. |
| Browser interaction / visual review | Passed (dev) | Password sign-in, wrong-password error, evidence submission, out-of-range serial error, sign-out, non-reviewer denial on /admin, reviewer approve, and the public tracker update all exercised in the browser. Pages render at desktop and 375px widths with no horizontal page scroll. |
| Hosted Supabase/Auth/PostgREST | Passed (dev) | Both migrations applied to `know-before-you-rip-dev`; RLS on all 12 tables; security advisor clean. Three-account smoke test (reviewer A, collectors B and C) passed 59/59 checks through the local API and Data API, using a synthetic checklist in a separate `synthetic-smoke-test` release. |
| Official manufacturer dataset | Not imported | No source has been promoted from the original unvalidated preview. No production pull confirmations, prices or odds added. |
| Live eBay | Not run | No authorized token supplied; discovery stays disabled. |

13 automated tests passed on Node 22.23.1. Dependency audit reported zero known vulnerabilities at implementation time (not a guarantee against future advisories). Test data is synthetic, isolated to temporary embedded databases, and never seeded into the real release.

## Hosted dev smoke test — 2026-10-21

Run against localhost and the dev project with server-generated magic-link sessions (no passwords). Covered:

- Import: only the reviewer can stage and publish; staged rows and unverified sources stay hidden publicly; publishing needs both confirmations and can't be repeated; blank print runs stay null; the PostgREST provenance join works; anon can't read extracted text or reviewer identity.
- Evidence: B's pending `03/25` is hidden from C; B and C can't review through the API, the Data API status update, the RPC, self-assigned roles, direct sighting inserts, forged submitter, or pre-approved inserts.
- Counting: approve → 1; a second source for `3/25` → still 1; a rejected item contributes 0 and stays terminal; revoke one → 1, revoke both → 0; the unsighted copy is hidden; 5 audit events remain.
- Rejections: `26/25`, `3/30`, unnumbered parallel, `11/10` via Data API (trigger), duplicate source (409), future observation, unauthenticated or bad token (401).
- Role removal: A gets 403 after the `admin_roles` row is deleted and works again once it is restored. A signed-out session token gets 401.

## Browser walkthrough — 2026-10-21

Collector C signed in on `/evidence`, saw only their own history, submitted `12/25` (pending), and got a clear error for `30/25`. On `/admin`, C got "Reviewer access required". Reviewer A loaded the queue, approved with both confirmations and a reason, and `/chases` then showed `1 DOCUMENTED` with the evidence link and checklist provenance.

Two UI defects found and fixed:
- A non-reviewer on `/admin` saw their own submissions with review controls (the server still refused the action). The queue now loads only after reviewer access is confirmed.
- supabase-js re-emits `SIGNED_IN` when the tab regains focus, which wiped the queue and any in-progress review, for example after opening the source in another tab. State now resets only when the signed-in user changes.
