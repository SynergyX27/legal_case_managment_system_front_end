import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/lf/ui-bits";

export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({ meta: [{ title: "Automations – LegalFlow" }, { name: "description", content: "Automations in LegalFlow." }, { property: "og:title", content: "Automations – LegalFlow" }, { property: "og:description", content: "Automations in LegalFlow." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Automations" subtitle="This section is being built next." />
      <Panel><p className="p-6 text-sm text-muted-foreground">Coming in the next step of the prototype.</p></Panel>
    </>
  );
}
