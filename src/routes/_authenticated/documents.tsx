import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/lf/ui-bits";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents – LegalFlow" }, { name: "description", content: "Documents in LegalFlow." }, { property: "og:title", content: "Documents – LegalFlow" }, { property: "og:description", content: "Documents in LegalFlow." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Documents" subtitle="This section is being built next." />
      <Panel><p className="p-6 text-sm text-muted-foreground">Coming in the next step of the prototype.</p></Panel>
    </>
  );
}
