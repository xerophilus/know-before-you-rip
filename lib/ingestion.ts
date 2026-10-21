import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { validateRows, type ChecklistRow } from "./validation";
export function parseChecklistCsv(
  text: string,
  pdfMapping: boolean | "csv" = false,
): ChecklistRow[] {
  const records: Record<string, string>[] = parse(text, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
    max_record_size: 20000,
  });
  return validateRows(
    records.map((r, i) => {
      if (!["", undefined].includes(r.print_run) && !/^\d+$/.test(r.print_run))
        throw new Error(`Invalid print_run at record ${i + 1}`);
      if (pdfMapping === true && !/^page:\d+/.test(r.locator ?? ""))
        throw new Error("PDF mappings require page:N locators");
      if (pdfMapping === "csv" && !/^record:\d+$/.test(r.locator ?? ""))
        throw new Error("CSV mappings require record:N locators");
      return {
        set: r.set,
        card_number: r.card_number,
        subject: r.subject,
        parallel: r.parallel,
        print_run: r.print_run ? Number(r.print_run) : null,
        locator: pdfMapping ? r.locator : `record:${i + 1}`,
      };
    }),
  );
}
export async function extractPdf(bytes: Uint8Array) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const pdf = await task.promise;
  try {
    if (pdf.numPages > 500) throw new Error("PDF exceeds 500 pages");
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n),
        content = await page.getTextContent();
      const text = content.items
        .map((item) =>
          "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
        )
        .join("");
      pages.push({ locator: `page:${n}`, text });
    }
    if (!pages.some((page) => page.text.trim()))
      throw new Error(
        "No extractable text; OCR and manual verification are required",
      );
    return pages;
  } finally {
    await pdf.destroy();
  }
}
export const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
