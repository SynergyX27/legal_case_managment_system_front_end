import { createFileRoute } from "@tanstack/react-router";
import { FileManager } from "@/components/lf/file-manager";
export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "File Manager – LegalFlow" }] }),
  component: () => <FileManager />,
});
