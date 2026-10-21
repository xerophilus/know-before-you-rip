import { z } from "zod";
const responseSchema = z.object({
  itemSummaries: z
    .array(
      z.object({
        itemId: z.string(),
        title: z.string(),
        itemWebUrl: z.url(),
        price: z.object({ value: z.string(), currency: z.string() }).optional(),
      }),
    )
    .optional(),
});
export type DiscoveryOptions = {
  enabled: boolean;
  token?: string;
  sandbox: boolean;
};
export async function discoverEbay(
  query: string,
  options: DiscoveryOptions,
  transport: typeof fetch = fetch,
) {
  if (!options.enabled)
    return {
      enabled: false,
      candidates: [],
      notice: "Marketplace discovery is disabled",
    };
  if (!options.token)
    throw new Error("Authorized eBay application token required");
  if (!query.trim() || query.length > 200)
    throw new Error("Query must contain 1–200 characters");
  const host = options.sandbox ? "api.sandbox.ebay.com" : "api.ebay.com";
  const url = new URL(`https://${host}/buy/browse/v1/item_summary/search`);
  url.search = new URLSearchParams({ q: query, limit: "20" }).toString();
  const response = await transport(url, {
    headers: {
      Authorization: `Bearer ${options.token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 429)
    throw new Error("eBay rate limit reached. Wait before another search.");
  if (!response.ok)
    throw new Error(`eBay discovery unavailable (${response.status})`);
  const parsed = responseSchema.parse(await response.json());
  return {
    enabled: true,
    notice:
      "Unreviewed active listings. Asking prices are not sold prices; no pull is confirmed.",
    candidates: (parsed.itemSummaries ?? [])
      .filter((item) => {
        const u = new URL(item.itemWebUrl);
        return (
          u.protocol === "https:" &&
          (u.hostname === "ebay.com" || u.hostname.endsWith(".ebay.com"))
        );
      })
      .map((item) => ({
        provider: "ebay",
        externalId: item.itemId,
        title: item.title,
        sourceUrl: item.itemWebUrl,
        askingPrice: item.price ?? null,
        discoveredAt: new Date().toISOString(),
        environment: options.sandbox ? "sandbox" : "production",
        status: "unreviewed",
      })),
  };
}
