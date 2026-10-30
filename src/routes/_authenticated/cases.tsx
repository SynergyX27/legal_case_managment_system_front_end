import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/lf/ui-bits";

export const Route = createFileRoute("/_authenticated/cases")({
  head: () => ({ meta: [{ title: "Cases – LegalFlow" }, { name: "description", content: "Cases in LegalFlow." }, { property: "og:title", content: "Cases – LegalFlow" }, { property: "og:description", content: "Cases in LegalFlow." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Cases" subtitle="This section is being built next." />
      <Panel><p className="p-6 text-sm text-muted-foreground">Coming in the next step of the prototype.</p></Panel>
    </>
  );
}
