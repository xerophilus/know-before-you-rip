import { createClient } from "@supabase/supabase-js";
export function configured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
export function userDb(token?: string) {
  if (!configured()) throw new Error("Supabase is not configured");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : undefined,
    },
  );
}
export function serviceDb() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("Server database key is not configured");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
// Shared limits: [max requests, window in seconds]. Counters live in Postgres so
// every server instance enforces the same totals.
export const limits = {
  ip: [120, 60],
  evidence: [30, 3600],
  review: [300, 3600],
  imports: [20, 3600],
  discovery: [30, 3600],
  discoveryGlobal: [1000, 86400],
} as const satisfies Record<string, readonly [number, number]>;
export async function rateLimit(
  bucket: string,
  limit: readonly [number, number],
) {
  const { data, error } = await serviceDb().rpc("rate_limit_hit", {
    p_bucket: bucket,
    p_max: limit[0],
    p_window_seconds: limit[1],
  });
  if (error) throw new Error("Rate limiter unavailable");
  if (data !== true)
    throw new HttpError(
      429,
      "Too many requests. Wait a few minutes and try again.",
    );
}
// Vercel overwrites x-forwarded-for with the connecting client's address.
export function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}
export async function authenticate(request: Request, admin = false) {
  if (!configured())
    throw new HttpError(503, "Evidence service is not configured yet");
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, "Sign in to continue");
  await rateLimit(`ip:${clientIp(request)}`, limits.ip);
  const db = userDb(token);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user || data.user.is_anonymous)
    throw new HttpError(401, "Sign in with a registered account");
  if (admin) {
    const role = await db
      .from("admin_roles")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (role.error || !role.data)
      throw new HttpError(403, "Reviewer access required");
  }
  return { db, user: data.user };
}
export async function body(request: Request, limit = 16000) {
  // Bound the actual stream, not just the client-supplied Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError(413, "Request too large");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.name === "ZodError")
    return Response.json(
      { error: "Invalid fields. Check the required values and formats." },
      { status: 400 },
    );
  console.error(
    "Evidence service failure",
    error instanceof Error ? error.message : "Unknown error",
  );
  return Response.json(
    {
      error:
        "The request could not be completed. Refresh to check the current state before retrying.",
    },
    { status: 500 },
  );
}
