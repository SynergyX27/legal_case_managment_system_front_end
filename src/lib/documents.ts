import type { Attachment, Case } from "./domain";

export type DocumentRecord = Attachment & { caseId: string; caseNumber: string; clientId: string };
export function documentRecords(cases: Case[]): DocumentRecord[] {
  return cases.flatMap((c) =>
    c.attachments.map((a) => ({ ...a, caseId: c.id, caseNumber: c.number, clientId: c.clientId })),
  );
}
export function filterDocuments(
  records: DocumentRecord[],
  search: string,
  type: string,
  caseId: string,
) {
  const q = search.trim().toLowerCase();
  return records.filter(
    (r) =>
      (!q || [r.name, r.caseNumber, r.uploadedBy].join(" ").toLowerCase().includes(q)) &&
      (!type || r.type === type) &&
      (!caseId || r.caseId === caseId),
  );
}
export function fileKind(file: Pick<File, "type" | "name">): Attachment["type"] {
  const name = file.name.toLowerCase();
  return file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
      ? "video"
      : name.endsWith(".pdf")
        ? "pdf"
        : /\.docx?$/.test(name)
          ? "word"
          : /\.xlsx?$/.test(name)
            ? "excel"
            : "other";
}
export function hasLocalContent(file: Attachment) {
  return !!file.url?.startsWith("/api/documents/");
}
