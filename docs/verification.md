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
| Browser interaction / visual review | Blocked | In-app browser failed to attach; Chrome automation unavailable. No claim of browser interaction testing. |
| Hosted Supabase/Auth/PostgREST | Not run | No development project credentials supplied; migration not applied remotely. Follow the three-account smoke test in deployment.md. |
| Official manufacturer dataset | Not imported | No source has been promoted from the original unvalidated preview. No production pull confirmations, prices or odds added. |
| Live eBay | Not run | No authorized token supplied; discovery stays disabled. |

13 automated tests passed on Node 22.23.1. Dependency audit reported zero known vulnerabilities at implementation time (not a guarantee against future advisories). Test data is synthetic, isolated to temporary embedded databases, and never seeded into the real release.
