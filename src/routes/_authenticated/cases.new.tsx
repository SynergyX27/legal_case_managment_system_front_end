import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CaseForm } from "@/components/lf/case-form-dialog";
import { useMe } from "@/lib/store";
import { PageHeader } from "@/components/lf/ui-bits";

export const Route = createFileRoute("/_authenticated/cases/new")({
  head: () => ({ meta: [{ title: "Create case – LegalFlow" }] }),
  component: CreateCasePage,
});
function CreateCasePage() {
  const navigate = useNavigate();
  const me = useMe();
  if (!me || !["owner", "manager"].includes(me.role))
    return <PageHeader title="Owner or manager access required" />;
  return (
    <CaseForm
      presentation="page"
      onCancel={() => navigate({ to: "/cases" })}
      onSaved={(id) => navigate({ to: "/cases/$id", params: { id } })}
    />
  );
}
