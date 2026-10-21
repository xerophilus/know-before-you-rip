import { readFile, writeFile, stat, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { digest, extractPdf, parseChecklistCsv } from "../lib/ingestion";
import { importInput } from "../lib/validation";
// Explicit local files only: no URL fetcher, URL redirects, or SSRF surface.
async function main() {
  const [file, metadataPath, out, mapping] = process.argv.slice(2);
  if (!file || !metadataPath || !out)
    throw new Error(
      "Usage: npm run ingest -- source.csv|pdf metadata.json output.json [reviewed-mapping.csv]",
    );
  if ((await stat(file)).size > 20000000)
    throw new Error("Source exceeds 20 MB");
  const bytes = await readFile(file),
    metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  const pdf = path.extname(file).toLowerCase() === ".pdf";
  if (!pdf && path.extname(file).toLowerCase() !== ".csv")
    throw new Error("Only CSV or PDF sources are accepted");
  const extracted = pdf
    ? await extractPdf(bytes)
    : [{ locator: "document", text: bytes.toString("utf8") }];
  // Preserve source bytes by hash for later audit; never publish directly from extraction.
  const archive = path.join(path.dirname(out), "source-archive");
  await mkdir(archive, { recursive: true });
  await copyFile(
    file,
    path.join(archive, `${digest(bytes)}${pdf ? ".pdf" : ".csv"}`),
  );
  if (pdf && !mapping) {
    await writeFile(
      out,
      JSON.stringify(
        { ...metadata, sha256: digest(bytes), extracted },
        null,
        2,
      ),
    );
    console.log(
      "Extracted pages saved. Review the original PDF, prepare a mapping CSV with page:N locators, then rerun with the mapping path. This extraction cannot be published.",
    );
    return;
  }
  const rows = parseChecklistCsv(
    mapping ? await readFile(mapping, "utf8") : bytes.toString("utf8"),
    pdf ? true : mapping ? "csv" : false,
  );
  if (
    pdf &&
    rows.some(
      (r) => !extracted.some((p) => p.locator === r.locator.split(/\s/)[0]),
    )
  )
    throw new Error("Mapping references a page absent from the PDF");
  if (!pdf && mapping) {
    const recordCount =
      parse(bytes.toString("utf8"), {
        bom: true,
        skip_empty_lines: true,
        max_record_size: 20000,
      }).length - 1;
    if (
      rows.some(
        (r) =>
          Number(r.locator.split(":")[1]) < 1 ||
          Number(r.locator.split(":")[1]) > recordCount,
      )
    )
      throw new Error("Mapping references a missing CSV record");
  }
  const payload = importInput.parse({
    ...metadata,
    filename: path.basename(file),
    mediaType: pdf ? "application/pdf" : "text/csv",
    sha256: digest(bytes),
    extracted,
    rows,
  });
  const json = JSON.stringify(payload, null, 2);
  if (Buffer.byteLength(json) > 4000000)
    throw new Error("Import payload exceeds 4 MB. Split by source document.");
  await writeFile(out, json);
  console.log(
    `Prepared ${rows.length} variants for review. Upload this JSON in /admin; publication requires explicit review.`,
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
