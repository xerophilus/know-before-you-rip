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
export async function authenticate(request: Request, admin = false) {
  if (!configured())
    throw new HttpError(503, "Evidence service is not configured yet");
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, "Sign in to continue");
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
