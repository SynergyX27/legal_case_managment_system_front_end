import type { Attachment, Case } from "./mock-data";

export type DocumentRecord = Attachment & { caseId: string; caseNumber: string; clientId: string };
export function documentRecords(cases: Case[]): DocumentRecord[] {
  return cases.flatMap((c) => c.attachments.map((a) => ({ ...a, caseId: c.id, caseNumber: c.number, clientId: c.clientId })));
}
export function filterDocuments(records: DocumentRecord[], search: string, type: string, caseId: string) {
  const q = search.trim().toLowerCase();
  return records.filter((r) => (!q || [r.name, r.caseNumber, r.uploadedBy].join(" ").toLowerCase().includes(q)) && (!type || r.type === type) && (!caseId || r.caseId === caseId));
}
export const LOCAL_FILE_BUDGET = 2 * 1024 * 1024;
export function fileKind(file: Pick<File, "type" | "name">): Attachment["type"] {
  const name = file.name.toLowerCase();
  return file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : name.endsWith(".pdf") ? "pdf" : /\.docx?$/.test(name) ? "word" : /\.xlsx?$/.test(name) ? "excel" : "other";
}
export function hasLocalContent(file: Attachment) {
  return !!file.url?.startsWith("data:");
}
export function readLocalFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read file"));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}