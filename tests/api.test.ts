import test from "node:test";
import assert from "node:assert/strict";
import { body, HttpError, authenticate } from "../lib/server/supabase";
import { POST as submit } from "../app/api/evidence/route";
import { POST as review } from "../app/api/review/route";
import { PATCH as publish } from "../app/api/imports/route";
test("unconfigured write endpoints fail closed, never claim success", async () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  for (const endpoint of [submit, review, publish])
    assert.equal(
      (
        await endpoint(
          new Request("https://example.com/api", {
            method: "POST",
            body: "{}",
          }),
        )
      ).status,
      503,
    );
});
test("actual request size is bounded even without content length", async () => {
  await assert.rejects(
    body(
      new Request("https://example.com", {
        method: "POST",
        body: "x".repeat(100),
      }),
      20,
    ),
    (error: unknown) => error instanceof HttpError && error.status === 413,
  );
  await assert.rejects(
    body(
      new Request("https://example.com", { method: "POST", body: "invalid" }),
    ),
    (error: unknown) => error instanceof HttpError && error.status === 400,
  );
});
test("configured service requires a bearer credential", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.com";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
  await assert.rejects(
    authenticate(new Request("https://example.com")),
    (error: unknown) => error instanceof HttpError && error.status === 401,
  );
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
});
