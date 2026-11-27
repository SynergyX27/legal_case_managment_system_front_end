import { useState } from "react";
import { useMe, useStore } from "@/lib/store";
import { can } from "@/lib/access";
import { STATUSES, type Case } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModernSelect } from "@/components/ui/modern-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
export function RestrictedCaseEdit({ row }: { row: Case }) {
  const me = useMe(),
    s = useStore();
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false);
  if (can(me, "cases.edit")) return null;
  const legal = can(me, "cases.edit_legal"),
    ops = can(me, "cases.edit_operations"),
    progress = can(me, "cases.update_progress");
  if (!legal && !ops && !progress) return null;
  const fields = [
    ...(legal ? ["attorney", "court", "notes"] : []),
    ...(ops ? ["serviceDate", "serviceTime", "instructions"] : []),
  ];
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setDraft(
            Object.fromEntries(
              [...fields, "status"].map((k) => [k, String((row as any)[k] || "")]),
            ),
          );
          setOpen(true);
        }}
      >
        Update assigned work
      </Button>
      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update assigned work</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Only the fields allowed by your role can be changed.
          </p>
          {(ops || progress) && (
            <label className="grid gap-2 text-sm">
              Status
              <ModernSelect
                value={draft["status"]}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              >
                {STATUSES.filter((s) => ops || !["Completed", "Cancelled"].includes(s)).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </ModernSelect>
            </label>
          )}
          {fields.map((k) => (
            <label key={k} className="grid gap-2 text-sm">
              {k}
              <Input
                type={k === "serviceDate" ? "date" : k === "serviceTime" ? "time" : "text"}
                value={draft[k] || ""}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
              />
            </label>
          ))}
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const patch = { ...draft };
                if (!ops && !progress) delete patch["status"];
                await api(`/cases/${row.id}`, {
                  method: "PUT",
                  body: { ...row, ...patch, updatedAt: row.updatedAt },
                });
                await s.refresh();
                setOpen(false);
                toast.success("Case updated");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Save changes
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
