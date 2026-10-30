import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/lf/ui-bits";

export const Route = createFileRoute("/_authenticated/cases/$id")({ head: () => ({ meta: [{ title: "Case detail – LegalFlow" }, { name: "description", content: "Case detail in the LegalFlow prototype." }, { property: "og:title", content: "Case detail – LegalFlow" }, { property: "og:description", content: "Case detail in the LegalFlow prototype." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Page });

function Page() {
  const { id } = Route.useParams();
  return <PageHeader title={id} subtitle="Detail page coming next." />;
}
