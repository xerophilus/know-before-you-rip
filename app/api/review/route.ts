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
const review = z
  .object({
    id: z.uuid(),
    decision: z.enum(["approved", "rejected", "revoked"]),
    reason: z.string().trim().min(10).max(2000),
    identityConfirmed: z.boolean(),
    serialConfirmed: z.boolean(),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const { user } = await authenticate(request, true);
    await rateLimit(`review:${user.id}`, limits.review);
    const input = review.parse(await body(request));
    if (
      input.decision === "approved" &&
      (!input.identityConfirmed || !input.serialConfirmed)
    )
      throw new HttpError(
        400,
        "Confirm the exact variant and visible serial stamp first",
      );
    const result = await serviceDb().rpc("review_evidence", {
      submission: input.id,
      reviewer: user.id,
      decision: input.decision,
      reason: input.reason,
    });
    if (result.error)
      throw new HttpError(
        409,
        "Review could not be applied. Refresh the queue and check the current status.",
      );
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
