import { authenticate, body, failure, HttpError } from "@/lib/server/supabase";
import { evidenceInput, parseSerial } from "@/lib/validation";
export async function GET(request: Request) {
  try {
    const { db } = await authenticate(request);
    const result = await db
      .from("evidence_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
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
    const { db, user } = await authenticate(request);
    const input = evidenceInput.parse(await body(request));
    const { data: parallel, error } = await db
      .from("parallels")
      .select("print_run")
      .eq("id", input.parallelId)
      .single();
    if (error || !parallel || parallel.print_run === null)
      throw new HttpError(400, "Choose a published numbered parallel");
    let serial: number;
    try {
      serial = parseSerial(input.serial, parallel.print_run);
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }
    const result = await db
      .from("evidence_submissions")
      .insert({
        submitter_id: user.id,
        parallel_id: input.parallelId,
        serial_number: serial,
        source_url: input.sourceUrl,
        locator: input.locator,
        observed_at: input.observedAt,
        note: input.note,
      })
      .select("id,status")
      .single();
    if (result.error?.code === "23505")
      throw new HttpError(
        409,
        "You already submitted this source for this numbered copy",
      );
    if (result.error) throw result.error;
    return Response.json(result.data, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
