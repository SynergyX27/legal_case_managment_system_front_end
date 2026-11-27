import { createFileRoute } from "@tanstack/react-router";
import { CompanyFileManager } from "@/components/lf/company-file-manager";
export const Route = createFileRoute("/_authenticated/company-documents")({
  head: () => ({ meta: [{ title: "Company files – LegalFlow" }] }),
  component: CompanyFileManager,
});
