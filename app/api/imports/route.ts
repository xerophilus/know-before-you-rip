import { z } from "zod";
import {
  authenticate,
  body,
  failure,
  serviceDb,
  HttpError,
  limits,
  rateLimit,
} from "@/lib/server/supabase";
import { importInput, validateRows } from "@/lib/validation";
export async function GET(request: Request) {
  try {
    await authenticate(request, true);
    const result = await serviceDb()
      .from("checklist_imports")
      .select("*,source_documents(*)")
      .order("created_at", { ascending: false })
      .limit(30);
    if (result.error) throw result.error;
    return Response.json(result.data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { user } = await authenticate(request, true);
    await rateLimit(`imports:${user.id}`, limits.imports);
    const input = importInput.parse(await body(request, 4000000));
    validateRows(input.rows);
    const result = await serviceDb().rpc("stage_checklist", {
      actor: user.id,
      payload: input,
    });
    if (result.error)
      throw new HttpError(
        409,
        "Could not stage import. Check release ID and whether this source was already staged.",
      );
    return Response.json({ id: result.data }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    const { user } = await authenticate(request, true);
    await rateLimit(`imports:${user.id}`, limits.imports);
    const input = z
      .object({
        id: z.uuid(),
        officialSourceConfirmed: z.literal(true),
        transcriptionConfirmed: z.literal(true),
      })
      .strict()
      .parse(await body(request));
    const result = await serviceDb().rpc("publish_checklist", {
      import_id: input.id,
      actor: user.id,
    });
    if (result.error)
      throw new HttpError(
        409,
        "Import could not publish. Check duplicate identities, conflicting print runs, or an already published import.",
      );
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
