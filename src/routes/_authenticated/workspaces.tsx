import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, MapPin, FolderOpen, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useMe, useStore } from "@/lib/store";
import { PageHeader, Panel } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workspaces")({ component: Workspaces });
export interface Portfolio {
  id: string;
  clientId: string;
  parentId: string;
  kind: "territory" | "community";
  name: string;
  state: string;
  updatedAt: string;
  archived: boolean;
  memberIds: string[];
  caseIds: string[];
  caseCount: number;
  openCount: number;
  balanceOwed: number;
}
function Workspaces() {
  const [editVersion, setEditVersion] = useState(""),
    [userVersion, setUserVersion] = useState("");
  const [selection, setSelection] = useState<string[]>([]),
    [target, setTarget] = useState("");
  const s = useStore(),
    me = useMe(),
    owner = me?.role === "owner";
  const [rows, setRows] = useState<Portfolio[]>([]),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(""),
    [filter, setFilter] = useState(""),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState("");
  const [form, setForm] = useState({
    name: "",
    clientId: "",
    kind: "territory",
    parentId: "",
    state: "",
  });
  const [userId, setUser] = useState(""),
    [mode, setMode] = useState("community"),
    [grants, setGrants] = useState<string[]>([]);
  const [contact, setContact] = useState({
    clientId: "",
    name: "",
    email: "",
    username: "",
    password: "",
    phone: "",
  });
  const load = () =>
    api("/workspaces")
      .then((r) => {
        setRows(r.workspaces);
        setError("");
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);
  const active = rows.find((r) => r.id === selected),
    user = s.users.find((u) => u.id === userId);
  const cases = active
    ? s.cases.filter((c) => active.caseIds.includes(c.id))
    : s.cases.filter((c) => !c.workspaceId);
  const action = async (fn: () => Promise<any>) => {
    setBusy(true);
    try {
      await fn();
      await s.refresh();
      await load();
      toast.success("Saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const chooseUser = (id: string) => {
    setUser(id);
    setUserVersion(s.users.find((x) => x.id === id)?.updatedAt || "");
    const u = s.users.find((x) => x.id === id);
    setMode(u?.customerAccess || "community");
    setGrants(rows.filter((w) => w.memberIds.includes(id)).map((w) => w.id));
  };
  return (
    <>
      <PageHeader
        title="Workspaces"
        subtitle="Browse customer territories and communities. Each case stays in one community and appears in its territory."
      />
      {error && (
        <p role="alert" className="mb-4 rounded border border-destructive p-3 text-sm">
          {error}
        </p>
      )}
      <div className="mb-5 flex flex-wrap gap-2">
        <Input
          className="max-w-md"
          placeholder="Search territories or communities…"
          aria-label="Search workspaces"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Button variant="outline" onClick={() => setSelected("__unassigned")}>
          Unassigned cases
        </Button>
      </div>
      {!!selected && (
        <Button className="mb-4" variant="outline" onClick={() => setSelected("")}>
          ← All workspaces
        </Button>
      )}
      {!selected && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows
            .filter(
              (w) =>
                !w.archived && (!filter || w.name.toLowerCase().includes(filter.toLowerCase())),
            )
            .map((w) => (
              <button
                key={w.id}
                onClick={() => setSelected(w.id)}
                className={`rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:border-primary ${selected === w.id ? "border-primary ring-1 ring-primary" : ""}`}
              >
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {w.kind === "territory" ? (
                    <MapPin className="size-5" />
                  ) : (
                    <Building2 className="size-5" />
                  )}
                </span>
                <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                  {s.clients.find((c) => c.id === w.clientId)?.company ||
                    s.clients.find((c) => c.id === w.clientId)?.name}{" "}
                  · {w.kind}
                </span>
                <span className="mt-1 block text-lg font-semibold">WS – {w.name}</span>
                <span className="mt-2 block text-sm text-muted-foreground">
                  {w.caseCount} cases · {w.openCount} open
                </span>
                {w.parentId && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Territory: {rows.find((p) => p.id === w.parentId)?.name}
                  </span>
                )}
              </button>
            ))}
        </div>
      )}
      <Panel title={active ? `WS – ${active.name}` : "Cases awaiting workspace assignment"}>
        {owner && (
          <div className="mb-4 space-y-2 rounded-xl border bg-muted/30 p-3">
            <p className="text-sm">Move selected cases ({selection.length}, maximum 200)</p>
            <select
              aria-label="Bulk destination workspace"
              className="rounded border bg-background p-2 text-sm"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Unassigned</option>
              {rows
                .filter((w) => w.kind === "community" && !w.archived)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {s.clients.find((c) => c.id === w.clientId)?.name} · {w.name}
                  </option>
                ))}
            </select>
            <Button
              className="ml-2"
              disabled={busy || selection.length === 0 || selection.length > 200}
              onClick={() =>
                action(async () => {
                  await api("/workspaces/move-cases", {
                    method: "POST",
                    body: {
                      workspaceId: target,
                      cases: selection.map((id) => {
                        const c = s.cases.find((c) => c.id === id);
                        return { id, updatedAt: c?.updatedAt };
                      }),
                    },
                  });
                  setSelection([]);
                })
              }
            >
              Move selected
            </Button>
            <p className="text-xs text-muted-foreground">
              The destination must belong to every selected case’s customer company.
            </p>
          </div>
        )}

        {active && owner && (
          <div className="mb-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEdit(active.id);
                setEditVersion(active.updatedAt);
                setForm({
                  name: active.name,
                  clientId: active.clientId,
                  kind: active.kind,
                  parentId: active.parentId,
                  state: active.state,
                });
              }}
            >
              Edit workspace
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (confirm("Archive this empty workspace?"))
                  void action(() =>
                    api(`/workspaces/${active.id}/archive`, {
                      method: "POST",
                      body: { updatedAt: active.updatedAt },
                    }),
                  );
              }}
            >
              Archive empty workspace
            </Button>
          </div>
        )}
        {cases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accessible cases in this view.</p>
        ) : (
          <div className="divide-y">
            {cases.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                {owner && (
                  <input
                    aria-label={"Select case " + c.number}
                    type="checkbox"
                    checked={selection.includes(c.id)}
                    onChange={(e) =>
                      setSelection(
                        e.target.checked
                          ? [...selection, c.id]
                          : selection.filter((id) => id !== c.id),
                      )
                    }
                  />
                )}
                <Link to="/cases/$id" params={{ id: c.id }} className="min-w-0">
                  <span className="font-medium text-primary">{c.number}</span>
                  <span className="block text-sm">
                    {c.residentName} · {c.community || c.residentAddress}
                  </span>
                  <span className="text-xs text-muted-foreground">{c.status}</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Panel>
      {owner && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title={edit ? "Edit workspace" : "Create territory / community"}>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void action(async () => {
                  await api("/workspaces/" + (edit || "new"), {
                    method: "PUT",
                    body: { ...form, updatedAt: edit ? editVersion : undefined },
                  });
                  setEdit("");
                  setForm({ name: "", clientId: "", kind: "territory", parentId: "", state: "" });
                });
              }}
            >
              <label className="block text-sm">
                Customer company
                <select
                  required
                  disabled={!!edit}
                  className="mt-1 w-full rounded border bg-background p-2"
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value, parentId: "" })}
                >
                  <option value="">Select customer</option>
                  {s.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company || c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Workspace type
                <select
                  disabled={!!edit}
                  className="mt-1 w-full rounded border bg-background p-2"
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value, parentId: "" })}
                >
                  <option value="territory">Territory / market</option>
                  <option value="community">Community / property group</option>
                </select>
              </label>
              {form.kind === "community" && (
                <label className="block text-sm">
                  Parent territory
                  <select
                    required
                    disabled={!!edit}
                    className="mt-1 w-full rounded border bg-background p-2"
                    value={form.parentId}
                    onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  >
                    <option value="">Select territory</option>
                    {rows
                      .filter(
                        (w) =>
                          w.clientId === form.clientId && w.kind === "territory" && !w.archived,
                      )
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <Input
                required
                aria-label="Workspace name"
                placeholder="Workspace name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                maxLength={2}
                aria-label="Workspace state"
                placeholder="State abbreviation (optional)"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              />
              <Button disabled={busy}>Save workspace</Button>
              {edit && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEdit("");
                    setForm({ name: "", clientId: "", kind: "territory", parentId: "", state: "" });
                  }}
                >
                  Cancel edit
                </Button>
              )}
            </form>
          </Panel>
          <Panel title="People & workspace access">
            <div className="space-y-3">
              <select
                aria-label="Workspace member"
                className="w-full rounded border bg-background p-2"
                value={userId}
                onChange={(e) => chooseUser(e.target.value)}
              >
                <option value="">Select a user</option>
                {s.users
                  .filter((u) => u.status === "Active" && u.role !== "owner")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} · {u.role}
                    </option>
                  ))}
              </select>
              {user?.role === "customer" && (
                <select
                  aria-label="Customer workspace access level"
                  className="w-full rounded border bg-background p-2"
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value);
                    setGrants([]);
                  }}
                >
                  <option value="all">All company communities (customer administrator)</option>
                  <option value="regional">
                    Regional / district manager – selected territories
                  </option>
                  <option value="community">Community manager – selected communities</option>
                </select>
              )}
              {user && (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {rows
                    .filter(
                      (w) =>
                        !w.archived &&
                        (user.role !== "customer" ||
                          (w.clientId === user.clientId &&
                            (mode === "all" ||
                              w.kind === (mode === "regional" ? "territory" : "community")))),
                    )
                    .map((w) => (
                      <label className="flex items-center gap-2 text-sm" key={w.id}>
                        <input
                          type="checkbox"
                          disabled={mode === "all" && user.role === "customer"}
                          checked={grants.includes(w.id)}
                          onChange={(e) =>
                            setGrants(
                              e.target.checked
                                ? [...grants, w.id]
                                : grants.filter((id) => id !== w.id),
                            )
                          }
                        />
                        {w.name} · {w.kind}
                      </label>
                    ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Regional access includes existing and future communities in selected territories.
                Internal staff and managers retain their assigned-case permissions.
              </p>
              <Button
                disabled={busy || !user}
                onClick={() =>
                  action(() =>
                    api("/workspace-access", {
                      method: "PUT",
                      body: {
                        userId,
                        customerAccess: mode,
                        workspaceIds: user?.role === "customer" && mode === "all" ? [] : grants,
                        updatedAt: userVersion,
                      },
                    }).then((r) => setUserVersion(r.updatedAt)),
                  )
                }
              >
                Save access
              </Button>
            </div>
          </Panel>
          <Panel title="Add another customer login to an existing company">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void action(async () => {
                  await api("/users", { method: "POST", body: { ...contact, role: "customer" } });
                  setContact({
                    clientId: "",
                    name: "",
                    email: "",
                    username: "",
                    password: "",
                    phone: "",
                  });
                });
              }}
            >
              <select
                required
                aria-label="Contact customer company"
                className="w-full rounded border bg-background p-2"
                value={contact.clientId}
                onChange={(e) => setContact({ ...contact, clientId: e.target.value })}
              >
                <option value="">Select existing customer company</option>
                {s.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company || c.name}
                  </option>
                ))}
              </select>
              {(["name", "email", "username", "password", "phone"] as const).map((k) => (
                <Input
                  key={k}
                  required={k !== "phone"}
                  minLength={k === "password" ? 10 : undefined}
                  type={k === "password" ? "password" : k === "email" ? "email" : "text"}
                  autoComplete="off"
                  aria-label={"Contact " + k}
                  placeholder={
                    k === "name"
                      ? "Full name"
                      : k === "password"
                        ? "Password (10–128 characters)"
                        : k
                  }
                  value={contact[k]}
                  onChange={(e) => setContact({ ...contact, [k]: e.target.value })}
                />
              ))}
              <p className="text-xs text-muted-foreground">
                New linked logins start with no case access. Assign their territories or communities
                above.
              </p>
              <Button disabled={busy}>Create customer login</Button>
            </form>
          </Panel>
        </div>
      )}
    </>
  );
}
