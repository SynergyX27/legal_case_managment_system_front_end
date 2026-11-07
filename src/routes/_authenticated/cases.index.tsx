import { createFileRoute } from "@tanstack/react-router";
import { CasesTable } from "@/components/lf/cases-table";

export const Route = createFileRoute("/_authenticated/cases/")({
  head: () => ({
    meta: [
      { title: "Case Files – LegalFlow" },
      {
        name: "description",
        content:
          "Manage legal case files, assignments and service dates in the LegalFlow workspace.",
      },
      { property: "og:title", content: "Case Files – LegalFlow" },
      { property: "og:description", content: "Legal case files, assignments and service dates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CasesTable,
});
