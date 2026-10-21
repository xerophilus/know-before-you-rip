# Incremental deployment plan

## 1. Local baseline

- Preserve the downloaded original ZIP. Install with `npm ci` using Node 22 LTS.
- Run `npm test`, `npm run typecheck`, `npm run build` and `npm audit`.
- Without keys, inspect release directory, the preview disclaimer, calculator, /evidence and /admin. Evidence endpoints must return 503, not claim a saved submission.
- This folder was originally delivered without Git metadata. Choose/create a remote and commit source plus lockfile before collaborating; never commit `.env.local` or source archives.

## 2. Isolated development database

- Provision a new Supabase development project and apply the initial migration, following README instructions. Record migration history consistently. Verify every table has RLS and run security/performance advisors.
- Configure confirmed test accounts: reviewer A, collector B, unrelated collector C. Assign A through `admin_roles`; no self-service escalation.
- Import a clearly labeled synthetic checklist into a **separate test release** (never the real product). Verify staging is invisible publicly and publication adds provenance.
- B submits `03/25`. C must not see B's pending record. Neither B nor C can approve through the API or Data API. A approves; the public tracker shows one copy with a source link.
- C submits a second source for `3/25`; A approves. Count must remain one. Reject a different pending item and verify it contributes zero. Revoke one approved source, then the other; count stays one then becomes zero. Audit events remain.
- Submit an out-of-range serial, a mismatched denominator, a forged reviewer identity and a duplicate submission; confirm rejection. Remove A's role and confirm further reviews fail.
- Check PostgREST joins for catalog provenance and sightings. Test session expiry/sign-out, API errors and mobile layouts. Embedded tests alone are not hosted integration certification.

## 3. Private preview

- Deploy the Next.js project to the chosen host with separate development secrets. No host/project was selected in this increment.
- Keep marketplace discovery disabled. Public environment variables must be supplied at build time; keep the service key server-only.
- Restrict preview access and invite a small review group. Add shared rate limiting/abuse controls before allowing open registration. Confirm error logging contains no credentials or private notes.
- Configure monitoring, source-archive persistence/backups and database backup/restore procedures. Assign an owner for evidence corrections and source takedown requests.

## 4. Verified product pilot

- Retrieve the real manufacturer checklist from an attributable official page. Compare its release/SKU, every normalized variant and numbered tier to the original. Do not promote the old curated targets to verified status automatically.
- Publish only reviewed rows and inspect links and hashes on the tracker. Leave unknown print runs blank. Do not claim manufacturer-verified box specs or MSRP until separately verified.
- Keep the sealed calculator as user-entered economics and the rip calculator labeled hypothetical/experimental. Probability-weighted EV remains unavailable until official SKU-specific odds and representative licensed sale data support it. Sightings do not adjust pack odds.

## 5. Marketplace pilot and production

- Confirm eBay API approval/scopes and current license/display/retention obligations. Obtain a production application token using the official OAuth flow; implement operational token rotation before unattended use.
- Enable reviewer-only discovery in preview first. Confirm 401/403/429/timeouts are handled, synthetic sandbox data never publishes and asking prices never populate sold-price or EV fields.
- Add shared provider/account quotas, pagination and retention controls before broader use. Production discovery remains an explicitly enabled scaffold, not a live pricing feed.
- Promote app and database independently after the hosted smoke test passes. Record the release commit and migration version.

## Rollback

Disable discovery first if provider behavior is at fault. Roll back application code/environment separately; the schema is additive and can remain in place. Do not drop evidence or rewrite review history to roll back an app. For an incorrect sighting, revoke it with a reason. For an incorrect checklist, prepare a reviewed forward migration that preserves source/audit history and checks dependent copies. Back up before any corrective data migration.
