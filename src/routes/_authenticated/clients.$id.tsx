import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/lf/ui-bits";

export const Route = createFileRoute("/_authenticated/clients/$id")({ head: () => ({ meta: [{ title: "Client detail – LegalFlow" }, { name: "description", content: "Client detail in the LegalFlow prototype." }, { property: "og:title", content: "Client detail – LegalFlow" }, { property: "og:description", content: "Client detail in the LegalFlow prototype." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Page });

function Page() {
  const { id } = Route.useParams();
  return <PageHeader title={id} subtitle="Detail page coming next." />;
}
