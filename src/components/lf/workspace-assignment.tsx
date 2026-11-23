import { ModernSelect } from "@/components/ui/modern-select";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useMe, useStore } from "@/lib/store";
import type { Case } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
export function WorkspaceAssignment({ row, afterSave }: { row: Case; afterSave?: () => any }) {
  const me = useMe(),
    s = useStore(),
    [rows, setRows] = useState<any[]>([]),
    [value, setValue] = useState(row.workspaceId || ""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/workspaces")
      .then((r) => setRows(r.workspaces))
      .catch(() => {});
  }, [row.clientId]);
  useEffect(() => setValue(row.workspaceId || ""), [row.workspaceId]);
  if (me?.role !== "owner") return null;
  return (
    <div className="flex flex-wrap gap-2">
      <ModernSelect
        aria-label={"Community workspace for " + row.number}
        className="max-w-xs rounded border bg-background px-2 py-2 text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="">Unassigned workspace</option>
        {rows
          .filter((w) => w.kind === "community" && w.clientId === row.clientId && !w.archived)
          .map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
      </ModernSelect>
      <Button
        variant="outline"
        disabled={busy || value === (row.workspaceId || "")}
        onClick={async () => {
          setBusy(true);
          try {
            await api(`/cases/${row.id}/workspace`, {
              method: "PATCH",
              body: { workspaceId: value, updatedAt: row.updatedAt },
            });
            await s.refresh();
            await afterSave?.();
            toast.success("Case workspace updated");
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Move case
      </Button>
    </div>
  );
}
