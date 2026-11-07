import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, ShieldCheck, UserPlus } from "lucide-react";
import { PageHeader, Avatar, StatusBadge } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OwnerUserForm } from "@/components/lf/user-editor";
import { useMe, useStore } from "@/lib/store";
import type { Role, User } from "@/lib/domain";
export const Route = createFileRoute("/_authenticated/users")({ component: Page });
function Page() {
  const s = useStore(),
    me = useMe();
  const [open, setOpen] = useState(false),
    [defaultRole, setDefaultRole] = useState<Role>("staff"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [editing, setEditing] = useState<User | null>(null),
    [role, setRole] = useState<Role>("staff"),
    [status, setStatus] = useState<User["status"]>("Active"),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false);
  if (me?.role !== "owner") return <PageHeader title="Owner access required" />;
  const rows = s.users.filter(
    (u) =>
      (filter === "all" || u.role === filter) &&
      [u.name, u.email, u.username].join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  const openCreate = (r: Role) => {
    setDefaultRole(r);
    setOpen(true);
  };
  return (
    <>
      <PageHeader
        title="People & access"
        subtitle="Create team accounts, customer profiles and their login credentials."
        actions={
          <>
            <Button variant="outline" onClick={() => openCreate("customer")}>
              <UserPlus />
              Add customer
            </Button>
            <Button onClick={() => openCreate("staff")}>
              <Plus />
              Add user
            </Button>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {(["owner", "manager", "staff", "customer"] as Role[]).map((r) => (
          <div key={r} className="metric-card">
            <p className="metric-label capitalize">{r === "staff" ? "Staff members" : r + "s"}</p>
            <p className="metric-value">{s.users.filter((u) => u.role === r).length}</p>
            <p className="metric-footer">
              {s.users.filter((u) => u.role === r && u.status === "Active").length} active
            </p>
          </div>
        ))}
      </div>
      <div className="records-toolbar mb-4 flex flex-wrap gap-3">
        <Input
          aria-label="Search people"
          className="sm:max-w-sm"
          placeholder="Search name, username or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Filter by role"
          className="h-10 rounded-xl border px-3 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All roles</option>
          {["owner", "manager", "staff", "customer"].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr>
              {["Person", "Username", "Role", "Customer profile", "Status", "Access"].map((h) => (
                <th key={h} className="p-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} />
                    <div>
                      {u.name}
                      <p className="mt-1 text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 font-mono text-xs">{u.username ?? u.email}</td>
                <td className="p-4 capitalize">{u.role}</td>
                <td className="p-4">
                  {s.clients.find((c) => c.id === u.clientId)?.company || "—"}
                </td>
                <td className="p-4">
                  <StatusBadge value={u.status} />
                </td>
                <td className="p-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(u);
                      setRole(u.role);
                      setStatus(u.status);
                      setPassword("");
                    }}
                  >
                    <ShieldCheck />
                    Manage access
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="p-8 text-center text-sm text-muted-foreground">No matching users.</p>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {defaultRole === "customer" ? "Add customer & login" : "Add user"}
            </DialogTitle>
          </DialogHeader>
          <OwnerUserForm defaultRole={defaultRole} onSaved={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(value) => !value && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage access · {editing?.name}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editing) return;
              setBusy(true);
              try {
                const error = await s.updateUserAccess(editing.id, {
                  role,
                  status,
                  password: password || undefined,
                });
                if (error) toast.error(error);
                else {
                  toast.success("Access updated");
                  setEditing(null);
                }
              } catch {
                toast.error("Could not update access");
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="text-xs text-muted-foreground">
              Username: {editing?.username ?? editing?.email}
            </p>
            <div className="space-y-2">
              <Label htmlFor="access-role">Role</Label>
              <select
                id="access-role"
                disabled={editing?.role === "customer" || editing?.id === me.id}
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="h-10 w-full rounded-xl border px-3 text-sm"
              >
                {(editing?.role === "customer" ? ["customer"] : ["owner", "manager", "staff"]).map(
                  (r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-status">Status</Label>
              <select
                id="access-status"
                disabled={editing?.id === me.id}
                value={status}
                onChange={(e) => setStatus(e.target.value as User["status"])}
                className="h-10 w-full rounded-xl border px-3 text-sm"
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-password">Set new password (optional)</Label>
              <Input
                id="access-password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep the existing password.
              </p>
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save access"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
