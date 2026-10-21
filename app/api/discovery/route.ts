import { authenticate, failure, HttpError } from "@/lib/server/supabase";
import { discoverEbay } from "@/lib/marketplace";
export async function GET(request: Request) {
  try {
    await authenticate(request, true);
    const q = new URL(request.url).searchParams.get("q") ?? "";
    if (!q.trim() || q.length > 200)
      throw new HttpError(400, "Enter a search of 1–200 characters");
    const result = await discoverEbay(q, {
      enabled: process.env.EBAY_DISCOVERY_ENABLED === "true",
      token: process.env.EBAY_APPLICATION_TOKEN,
      sandbox: process.env.EBAY_ENVIRONMENT !== "production",
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e);
  }
}
