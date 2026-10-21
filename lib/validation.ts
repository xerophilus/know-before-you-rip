import { z } from "zod";
export const httpsUrl = z
  .string()
  .max(2048)
  .url()
  .refine((value) => {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password;
  }, "Use an HTTPS URL without credentials");
export const evidenceInput = z
  .object({
    parallelId: z.uuid(),
    serial: z.string().max(40),
    sourceUrl: httpsUrl,
    locator: z.string().trim().min(3).max(500),
    observedAt: z.iso.datetime(),
    note: z.string().trim().max(2000).default(""),
  })
  .strict()
  .refine(
    (v) => Date.parse(v.observedAt) <= Date.now(),
    "Observation cannot be in the future",
  );
export function parseSerial(value: string, printRun: number) {
  const match = /^\s*0*(\d+)\s*\/\s*0*(\d+)\s*$/.exec(value);
  if (!match)
    throw new Error("Enter the visible serial stamp, for example 03/25");
  const serial = Number(match[1]),
    denominator = Number(match[2]);
  if (
    !Number.isSafeInteger(serial) ||
    !Number.isSafeInteger(denominator) ||
    serial < 1 ||
    denominator !== printRun ||
    serial > printRun
  ) {
    throw new Error("Serial stamp does not match this parallel’s print run");
  }
  return serial;
}
export const checklistRow = z
  .object({
    set: z.string().trim().min(1).max(200),
    card_number: z.string().trim().min(1).max(100),
    subject: z.string().trim().min(1).max(300),
    parallel: z.string().trim().min(1).max(200),
    print_run: z.number().int().min(1).max(1000000).nullable(),
    locator: z.string().trim().min(1).max(500),
  })
  .strict();
export const importInput = z
  .object({
    releaseId: z.uuid(),
    sourceUrl: httpsUrl,
    publisher: z.string().trim().min(1).max(200),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    filename: z.string().min(1).max(200),
    mediaType: z.enum(["text/csv", "application/pdf"]),
    extracted: z
      .array(
        z.object({
          locator: z.string().max(100),
          text: z.string().max(200000),
        }),
      )
      .min(1)
      .max(1000),
    rows: z.array(checklistRow).min(1).max(10000),
  })
  .strict();
export type ChecklistRow = z.infer<typeof checklistRow>;
export function validateRows(rows: unknown): ChecklistRow[] {
  const parsed = z.array(checklistRow).min(1).max(10000).parse(rows);
  const keys = new Set<string>();
  for (const r of parsed) {
    const key = JSON.stringify([
      r.set.toLowerCase(),
      r.card_number.toLowerCase(),
      r.parallel.toLowerCase(),
    ]);
    if (keys.has(key))
      throw new Error(
        `Duplicate checklist variant: ${r.set} / ${r.card_number} / ${r.parallel}`,
      );
    keys.add(key);
  }
  return parsed;
}
