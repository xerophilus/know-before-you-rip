import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
const admin = "00000000-0000-4000-8000-000000000001",
  user = "00000000-0000-4000-8000-000000000002",
  other = "00000000-0000-4000-8000-000000000003";
async function setup() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 grant usage on schema auth,public to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;
 insert into auth.users values('${admin}'),('${user}'),('${other}');`);
  for (const file of readdirSync("supabase/migrations").sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.query("insert into admin_roles values($1)", [admin]);
  const release = (await db.query<{ id: string }>("select id from releases"))
    .rows[0].id;
  return { db, release };
}
const row = {
  set: "Test Set",
  card_number: "TEST-1",
  subject: "Synthetic test subject",
  parallel: "Test Red",
  print_run: 5,
  locator: "record:1",
};
async function stage(
  db: PGlite,
  release: string,
  rows = [row],
  sha = "a".repeat(64),
) {
  return (
    await db.query<{ id: string }>("select stage_checklist($1,$2::jsonb) id", [
      admin,
      JSON.stringify({
        releaseId: release,
        sourceUrl: "https://example.com/test.csv",
        publisher: "Synthetic test fixture",
        sha256: sha,
        filename: "test.csv",
        mediaType: "text/csv",
        extracted: [{ locator: "document", text: "fixture" }],
        rows,
      }),
    ])
  ).rows[0].id;
}
async function asUser(db: PGlite, uid: string) {
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${uid}',false);select set_config('request.jwt.claims','{"is_anonymous":false}',false);`,
  );
}
async function submit(
  db: PGlite,
  parallel: string,
  uid = user,
  url = "https://example.com/photo",
) {
  return (
    await db.query<{ id: string }>(
      "insert into evidence_submissions(submitter_id,parallel_id,serial_number,source_url,locator,observed_at) values($1,$2,3,$3,'Photo 2',now()) returning id",
      [uid, parallel, url],
    )
  ).rows[0].id;
}
test("migration: stage, publish, RLS, exact-copy dedupe, review audit and revocation", async () => {
  const { db, release } = await setup();
  try {
    const batch = await stage(db, release);
    assert.equal((await db.query("select * from parallels")).rows.length, 0);
    await db.query("select publish_checklist($1,$2)", [batch, admin]);
    const parallel = (
      await db.query<{ id: string }>("select id from parallels")
    ).rows[0].id;
    await db.exec("set role anon");
    assert.equal((await db.query("select * from catalog")).rows.length, 1);
    assert.equal(
      (await db.query("select * from official_sources")).rows.length,
      1,
    );
    await assert.rejects(db.query("select * from source_documents"));
    await assert.rejects(db.query("select * from evidence_submissions"));
    await assert.rejects(
      db.query("select review_evidence($1,$2,'approved','Identity verified')", [
        admin,
        admin,
      ]),
    );
    await asUser(db, user);
    await assert.rejects(
      db.query("insert into admin_roles values($1)", [user]),
    );
    await assert.rejects(submit(db, parallel, other));
    const first = await submit(db, parallel);
    await assert.rejects(submit(db, parallel)); // source resubmission unique
    await assert.rejects(
      db.query(
        "update evidence_submissions set status='approved' where id=$1",
        [first],
      ),
    );
    await assert.rejects(
      db.query(
        "insert into evidence_submissions(submitter_id,parallel_id,serial_number,source_url,locator,observed_at) values($1,$2,6,'https://example.com/bad','Photo 1',now())",
        [user, parallel],
      ),
    );
    assert.equal(
      (await db.query("select * from serialized_copies")).rows.length,
      0,
    );
    await asUser(db, other);
    assert.equal(
      (await db.query("select * from evidence_submissions")).rows.length,
      0,
    );
    const second = await submit(
      db,
      parallel,
      other,
      "https://example.com/relist",
    );
    await db.exec("reset role;set role service_role");
    await assert.rejects(
      db.query(
        "select review_evidence($1,$2,'approved','Visible exact serial')",
        [first, user],
      ),
    );
    await db.query(
      "select review_evidence($1,$2,'approved','Visible exact serial')",
      [first, admin],
    );
    await db.query(
      "select review_evidence($1,$2,'approved','Visible exact serial')",
      [second, admin],
    );
    assert.equal(
      (await db.query("select * from serialized_copies")).rows.length,
      1,
    );
    assert.equal((await db.query("select * from sightings")).rows.length, 2);
    await assert.rejects(
      db.query(
        "select review_evidence($1,$2,'approved','Visible exact serial')",
        [first, admin],
      ),
    );
    await db.exec("set role anon");
    assert.equal(
      (await db.query<{ copies_seen: number }>("select * from catalog")).rows[0]
        .copies_seen,
      1,
    );
    await db.exec("set role service_role");
    await db.query(
      "select review_evidence($1,$2,'revoked','Source was invalidated')",
      [first, admin],
    );
    await db.exec("set role anon");
    assert.equal(
      (await db.query<{ copies_seen: number }>("select * from catalog")).rows[0]
        .copies_seen,
      1,
    );
    await db.exec("set role service_role");
    await db.query(
      "select review_evidence($1,$2,'revoked','Source was invalidated')",
      [second, admin],
    );
    assert.equal(
      (await db.query("select * from review_events")).rows.length,
      4,
    );
    await db.exec("set role anon");
    assert.equal(
      (await db.query<{ copies_seen: number }>("select * from catalog")).rows[0]
        .copies_seen,
      0,
    );
    assert.equal(
      (await db.query("select * from serialized_copies")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
test("conflicting checklist rolls back atomically; same document cannot be staged twice", async () => {
  const { db, release } = await setup();
  try {
    const batch = await stage(db, release);
    await db.query("select publish_checklist($1,$2)", [batch, admin]);
    await assert.rejects(stage(db, release));
    const conflict = await stage(
      db,
      release,
      [{ ...row, print_run: 25 }],
      "b".repeat(64),
    );
    await assert.rejects(
      db.query("select publish_checklist($1,$2)", [conflict, admin]),
    );
    assert.equal(
      (await db.query<{ print_run: number }>("select print_run from parallels"))
        .rows[0].print_run,
      5,
    );
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from checklist_imports where id=$1",
          [conflict],
        )
      ).rows[0].status,
      "staged",
    );
    assert.equal(
      (await db.query("select * from checklist_provenance")).rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
test("canonical identity across case/whitespace changes retains one parallel", async () => {
  const { db, release } = await setup();
  try {
    const first = await stage(db, release);
    await db.query("select publish_checklist($1,$2)", [first, admin]);
    const second = await stage(
      db,
      release,
      [
        {
          ...row,
          set: " test set ",
          card_number: "test-1",
          parallel: "test red",
        },
      ],
      "c".repeat(64),
    );
    await db.query("select publish_checklist($1,$2)", [second, admin]);
    assert.equal((await db.query("select * from parallels")).rows.length, 1);
    assert.equal(
      (await db.query("select * from checklist_provenance")).rows.length,
      2,
    );
  } finally {
    await db.close();
  }
});
test("shared rate limiter enforces windows and is server-only", async () => {
  const { db } = await setup();
  try {
    await db.exec("set role service_role");
    const hit = async (bucket = "ip:test") =>
      (
        await db.query<{ ok: boolean }>("select rate_limit_hit($1,2,60) ok", [
          bucket,
        ])
      ).rows[0].ok;
    assert.deepEqual(
      [await hit(), await hit(), await hit()],
      [true, true, false],
    );
    assert.equal(await hit("ip:other"), true, "buckets are independent");
    await db.exec(
      "update rate_limits set window_start=now()-interval '61 seconds' where bucket='ip:test'",
    );
    assert.equal(await hit(), true, "an expired window resets");
    await db.exec("reset role");
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query("select rate_limit_hit('ip:x',100,60)"));
      await assert.rejects(db.query("select * from rate_limits"));
      await db.exec("reset role");
    }
  } finally {
    await db.close();
  }
});
