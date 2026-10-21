import test from "node:test";
import assert from "node:assert/strict";
import { parseSerial, validateRows, evidenceInput } from "../lib/validation";
import { parseChecklistCsv, digest, extractPdf } from "../lib/ingestion";
import { discoverEbay } from "../lib/marketplace";
test("exact numbered-copy normalization and denominator validation", () => {
  assert.equal(parseSerial(" 003 / 025 ", 25), 3);
  for (const stamp of ["0/25", "26/25", "3/5", "3", "3.0/25", "1/1 extra"])
    assert.throws(() => parseSerial(stamp, 25));
});
test("CSV handles quoted fields, rejects invalid print runs, duplicates and missing identity", () => {
  const csv =
    'set,card_number,subject,parallel,print_run\nBase,1,"Test, Player",Red,5\n';
  assert.equal(parseChecklistCsv(csv)[0].subject, "Test, Player");
  assert.equal(parseChecklistCsv(csv)[0].locator, "record:1");
  assert.throws(() => parseChecklistCsv(csv.replace(",5\n", ",five\n")));
  assert.throws(() =>
    validateRows([...parseChecklistCsv(csv), ...parseChecklistCsv(csv)]),
  );
  assert.throws(() =>
    parseChecklistCsv(
      "set,card_number,subject,parallel,print_run\nBase,,Player,Red,5\n",
    ),
  );
  assert.throws(() => parseChecklistCsv(csv, true));
  assert.equal(
    digest(Buffer.from("abc")),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});
test("reject unsafe evidence URLs and future observations", () => {
  const input = {
    parallelId: "00000000-0000-4000-8000-000000000001",
    serial: "1/1",
    sourceUrl: "javascript:alert(1)",
    locator: "Photo 1",
    observedAt: "2020-01-01T00:00:00Z",
  };
  assert.equal(evidenceInput.safeParse(input).success, false);
  assert.equal(
    evidenceInput.safeParse({
      ...input,
      sourceUrl: "https://example.com",
      observedAt: "2999-01-01T00:00:00Z",
    }).success,
    false,
  );
});
test("discovery disabled means no network; authorized results never become confirmations or sold prices", async () => {
  let calls = 0;
  const transport = (async () => {
    calls++;
    return Response.json({
      itemSummaries: [
        {
          itemId: "test",
          title: "Synthetic listing",
          itemWebUrl: "https://www.ebay.com/itm/test",
          price: { value: "12", currency: "USD" },
        },
      ],
    });
  }) as typeof fetch;
  assert.equal(
    (await discoverEbay("test", { enabled: false, sandbox: true }, transport))
      .candidates.length,
    0,
  );
  assert.equal(calls, 0);
  const result = await discoverEbay(
    "test",
    { enabled: true, sandbox: true, token: "test-token" },
    transport,
  );
  assert.equal(result.candidates[0].status, "unreviewed");
  assert.equal(result.candidates[0].environment, "sandbox");
  assert.equal(result.candidates[0].askingPrice?.value, "12");
  await assert.rejects(
    discoverEbay("test", { enabled: true, sandbox: true }, transport),
  );
  await assert.rejects(
    discoverEbay(
      "test",
      { enabled: true, sandbox: true, token: "x" },
      (async () => new Response("", { status: 429 })) as typeof fetch,
    ),
  );
});
test("invalid PDFs fail closed", async () => {
  await assert.rejects(extractPdf(Buffer.from("Not a PDF")));
});

import { calculateScenario, money } from "../lib/finance";
test("preserved sealed ROI and hypothetical rip calculations; edge values stay finite", () => {
  const result = calculateScenario("440", "480", "13", "10", "100", "35", "10");
  assert.equal(result.sealedNet, 407.6);
  assert.equal(result.openedNet, 107.45);
  assert.ok(Math.abs(result.breakEven - 450 / 0.87) < 1e-9);
  assert.equal(money("Infinity"), 0);
  assert.equal(money("-5"), 0);
  assert.ok(
    Number.isFinite(
      calculateScenario("0", "0", "100", "0", "0", "0", "0").breakEven,
    ),
  );
});
test("text PDF extraction retains page locators for manual checklist mapping", async () => {
  const stream = "BT /F1 12 Tf 40 100 Td (Synthetic checklist test) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [i, obj] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => `${String(n).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const pages = await extractPdf(Buffer.from(pdf));
  assert.equal(pages[0].locator, "page:1");
  assert.match(pages[0].text, /Synthetic checklist test/);
});
