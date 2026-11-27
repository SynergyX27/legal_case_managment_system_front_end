import { createFileRoute } from "@tanstack/react-router";
import { FileManager } from "@/components/lf/file-manager";
export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "File Manager – LegalFlow" }] }),
  validateSearch: (
    s: Record<string, unknown>,
  ): { caseId?: string; collectionId?: string; approval?: string } => ({
    caseId:
      typeof s["caseId"] === "string" && /^[\w-]{1,150}$/.test(s["caseId"])
        ? s["caseId"]
        : undefined,
    collectionId:
      typeof s["collectionId"] === "string" && /^[\w-]{1,150}$/.test(s["collectionId"])
        ? s["collectionId"]
        : undefined,
    approval: ["pending", "approved", "rejected"].includes(String(s["approval"]))
      ? String(s["approval"])
      : undefined,
  }),
  component: Page,
});
function Page() {
  const s = Route.useSearch();
  return (
    <FileManager
      caseId={s["caseId"]}
      initialCollection={s["collectionId"]}
      initialApproval={s["approval"]}
    />
  );
}
