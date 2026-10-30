import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/lf/ui-bits";

export const Route = createFileRoute("/_authenticated/cases/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  return <PageHeader title={id} subtitle="Detail page coming next." />;
}
