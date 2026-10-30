import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/lf/ui-bits";

export const Route = createFileRoute("/_authenticated/communications")({
  head: () => ({ meta: [{ title: "Communications – LegalFlow" }, { name: "description", content: "Communications in LegalFlow." }, { property: "og:title", content: "Communications – LegalFlow" }, { property: "og:description", content: "Communications in LegalFlow." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Communications" subtitle="This section is being built next." />
      <Panel><p className="p-6 text-sm text-muted-foreground">Coming in the next step of the prototype.</p></Panel>
    </>
  );
}
