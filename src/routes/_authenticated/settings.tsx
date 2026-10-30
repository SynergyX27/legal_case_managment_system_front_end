import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/lf/ui-bits";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings – LegalFlow" }, { name: "description", content: "Settings in LegalFlow." }, { property: "og:title", content: "Settings – LegalFlow" }, { property: "og:description", content: "Settings in LegalFlow." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Settings" subtitle="This section is being built next." />
      <Panel><p className="p-6 text-sm text-muted-foreground">Coming in the next step of the prototype.</p></Panel>
    </>
  );
}
