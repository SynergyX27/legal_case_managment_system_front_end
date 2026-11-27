import { useState } from "react";
import { useMe, useStore } from "@/lib/store";
import type { Case } from "@/lib/domain";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
export function CaseTeam({ rows }: { rows: Case[] }) {
  const me = useMe(),
    s = useStore();
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false);
  if (!["owner", "manager"].includes(me?.role || "") || !rows.length) return null;
  const single = rows.length === 1;
  async function save() {
    setBusy(true);
    try {
      await api("/cases/team", {
        method: "PATCH",
        body: {
          cases: rows.map((c) => ({ id: c.id, updatedAt: c.updatedAt })),
          memberIds: selected,
          mode: single ? "replace" : "add",
        },
      });
      await s.refresh();
      setOpen(false);
      toast.success("Case team updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setSelected(single ? rows[0].teamMemberIds || [] : []);
          setQuery("");
          setOpen(true);
        }}
      >
        Assign team{single ? "" : ` · ${rows.length} cases`}
      </Button>
      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{single ? "Assign case team" : "Add team to selected cases"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Primary staff and manager remain responsible. Additional members gain case access; their
            existing action permissions still apply.{" "}
            {single
              ? "Uncheck a member to remove their additional access."
              : "Selected people will be added to every selected case without removing existing members."}
          </p>
          <Input
            aria-label="Search team members"
            placeholder="Search staff or managers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-72 space-y-2 overflow-auto">
            {s.users
              .filter(
                (u) =>
                  ["staff", "manager"].includes(u.role) &&
                  u.status === "Active" &&
                  u.name.toLowerCase().includes(query.toLowerCase()),
              )
              .map((u) => (
                <label key={u.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(u.id)}
                    disabled={busy}
                    onChange={() =>
                      setSelected((a) =>
                        a.includes(u.id) ? a.filter((id) => id !== u.id) : [...a, u.id],
                      )
                    }
                  />
                  <span>
                    {u.name}
                    <span className="ml-2 text-xs capitalize text-muted-foreground">{u.role}</span>
                  </span>
                </label>
              ))}
          </div>
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save team"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
