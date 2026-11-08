import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CaseForm } from "@/components/lf/case-form-dialog";
import { can } from "@/lib/access";
import { useMe } from "@/lib/store";
import { PageHeader } from "@/components/lf/ui-bits";

export const Route = createFileRoute("/_authenticated/cases/new")({
  head: () => ({ meta: [{ title: "Create case – LegalFlow" }] }),
  component: CreateCasePage,
});
function CreateCasePage() {
  const navigate = useNavigate();
  const me = useMe();
  if (!can(me, "cases.create")) return <PageHeader title="Case creation permission required" />;
  return (
    <CaseForm
      presentation="page"
      onCancel={() => navigate({ to: "/cases" })}
      onSaved={(id) => navigate({ to: "/cases/$id", params: { id } })}
    />
  );
}
