import { describe, expect, it } from "vitest";
import { buildSeed } from "@/lib/mock-data";
import { documentRecords, fileKind, filterDocuments, hasLocalContent, LOCAL_FILE_BUDGET } from "@/lib/documents";
import { useStore } from "@/lib/store";

describe("Local documents", () => {
  const seed = buildSeed();
  it("flattens only supplied case attachments with case references", () => {
    const c = { ...seed.cases[0], attachments: [{ id: "doc", name: "Notice.pdf", type: "pdf" as const, size: "1 KB", uploadedAt: "2026-10-30", uploadedBy: "Demo" }] };
    expect(documentRecords([c])).toEqual([{ ...c.attachments[0], caseId: c.id, caseNumber: c.number, clientId: c.clientId }]);
  });
  it("combines search, file type and case filters", () => {
    const records = documentRecords(seed.cases);
    const pdf = records.find((r) => r.type === "pdf");
    expect(pdf).toBeDefined();
    if (!pdf) return;
    expect(filterDocuments(records, pdf.name, "pdf", pdf.caseId).map((r) => r.id)).toEqual([pdf.id]);
    expect(filterDocuments(records, pdf.name, "image", pdf.caseId)).toEqual([]);
  });
  it("recognizes uppercase extensions and distinguishes actual local file content", () => {
    expect(fileKind({ name: "NOTICE.PDF", type: "" })).toBe("pdf");
    expect(fileKind({ name: "Evidence.png", type: "image/png" })).toBe("image");
    const a = seed.cases[0].attachments[0];
    const base = a ?? { id: "x", name: "x", type: "pdf" as const, size: "1 KB", uploadedAt: "", uploadedBy: "" };
    expect(hasLocalContent({ ...base, url: "data:application/pdf;base64,AA==" })).toBe(true);
    expect(hasLocalContent({ ...base, url: "blob:old-url" })).toBe(false);
  });
  it("keeps upload metadata and content on the linked local case", () => {
    const c = seed.cases[0];
    const a = { id: "uploaded-test", name: "local.txt", type: "other" as const, size: "1 KB", uploadedAt: "2026-10-30", uploadedBy: "Demo", url: "data:text/plain;base64,SGVsbG8=" };
    useStore.getState().addAttachments(c.id, [a]);
    expect(useStore.getState().cases.find((x) => x.id === c.id)?.attachments.find((x) => x.id === a.id)?.url).toBe(a.url);
    expect(LOCAL_FILE_BUDGET).toBe(2097152);
  });
});