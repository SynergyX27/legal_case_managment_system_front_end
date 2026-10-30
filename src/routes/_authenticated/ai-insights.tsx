import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/lf/ui-bits";

export const Route = createFileRoute("/_authenticated/ai-insights")({
  head: () => ({ meta: [{ title: "Ai Insights – LegalFlow" }, { name: "description", content: "Ai Insights in LegalFlow." }, { property: "og:title", content: "Ai Insights – LegalFlow" }, { property: "og:description", content: "Ai Insights in LegalFlow." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Ai Insights" subtitle="This section is being built next." />
      <Panel><p className="p-6 text-sm text-muted-foreground">Coming in the next step of the prototype.</p></Panel>
    </>
  );
}
