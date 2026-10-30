import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/lf/ui-bits";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard – LegalFlow" }, { name: "description", content: "Dashboard in LegalFlow." }, { property: "og:title", content: "Dashboard – LegalFlow" }, { property: "og:description", content: "Dashboard in LegalFlow." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Dashboard" subtitle="This section is being built next." />
      <Panel><p className="p-6 text-sm text-muted-foreground">Coming in the next step of the prototype.</p></Panel>
    </>
  );
}
