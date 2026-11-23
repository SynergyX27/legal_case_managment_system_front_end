import { CustomerLoginEditor } from "@/components/lf/customer-login-editor";
import { ModernSelect } from "@/components/ui/modern-select";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  MapPin,
  FolderOpen,
  Users,
  Plus,
  ArrowUpRight,
  ArrowLeft,
  Search,
  UserPlus,
  Layers3,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useMe, useStore } from "@/lib/store";
import { StatusBadge } from "@/components/lf/ui-bits";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import "@/styles/workspaces.css";
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
  const [dialog, setDialog] = useState<"create" | "access" | "contact" | "login" | null>(null),
    [kind, setKind] = useState("all"),
    [company, setCompany] = useState("");
  const [loading, setLoading] = useState(true);
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
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
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
  const live = rows.filter((w) => !w.archived);
  const filtered = rows.filter(
    (w) =>
      w.kind === "territory" &&
      (kind === "archived" ? owner && w.archived : !w.archived) &&
      (!company || w.clientId === company) &&
      [w.name, w.state, s.clients.find((c) => c.id === w.clientId)?.name]
        .join(" ")
        .toLowerCase()
        .includes(filter.toLowerCase()),
  );
  const unassigned = s.cases.filter((c) => !c.workspaceId).length;
  const companyName = (id: string) =>
    s.clients.find((c) => c.id === id)?.company ||
    s.clients.find((c) => c.id === id)?.name ||
    "Customer";
  const openCreate = () => {
    setEdit("");
    setForm({ name: "", clientId: company, kind: "territory", parentId: "", state: "" });
    setDialog("create");
  };
  const navigateWorkspace = (id: string) => {
    setSelection([]);
    setSelected(id);
  };
  return (
    <div className="workspace-page mx-auto w-full max-w-[1500px] space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">
            <Layers3 className="size-4" />
            Case organization
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Workspaces</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Open a workspace to manage its communities and case files.
          </p>
        </div>
        {owner && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDialog("access")}>
              <Users className="mr-2 size-4" />
              Customer access
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              Create workspace
            </Button>
          </div>
        )}
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
          <button className="ml-3 underline" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}
      {!selected ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Workspaces",
                count: live.filter((w) => w.kind === "territory").length,
                icon: MapPin,
                description: "Your markets and regions",
                click: () => setKind("all"),
              },
              {
                label: "Communities",
                count: live.filter((w) => w.kind === "community").length,
                icon: Building2,
                description: "Properties, connected",
                click: () => setKind("all"),
              },
              {
                label: "Unassigned cases",
                count: unassigned,
                icon: FolderOpen,
                description: "Ready to organize",
                click: () => navigateWorkspace("__unassigned"),
              },
            ].map((item) => (
              <button
                key={item.label}
                className="workspace-stat group rounded-2xl border bg-card p-5 text-left transition hover:border-primary/40"
                onClick={item.click}
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/8 text-primary">
                    <item.icon className="size-5" />
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-primary" />
                </div>
                <div className="mt-4 flex items-baseline gap-3">
                  <strong className="text-3xl font-semibold tracking-tight">{item.count}</strong>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              </button>
            ))}
          </div>
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Your workspaces</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose a workspace to explore its case files.
                </p>
              </div>
              {owner && (
                <Button variant="ghost" onClick={() => setDialog("contact")}>
                  <UserPlus className="mr-2 size-4" />
                  Add extra login
                </Button>
              )}
            </div>
            <div className="workspace-toolbar flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3">
              <div className="flex rounded-xl bg-muted p-1">
                {[
                  { id: "all", label: "Active workspaces" },
                  ...(owner ? [{ id: "archived", label: "Archived workspaces" }] : []),
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setKind(t.id)}
                    className={`rounded-lg px-4 py-2 text-xs font-medium transition ${kind === t.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-2">
                <label className="relative min-w-[200px] max-w-sm flex-1">
                  <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    aria-label="Search workspaces"
                    placeholder="Search workspaces…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </label>
                {s.clients.length > 1 && (
                  <ModernSelect
                    aria-label="Filter by customer company"
                    className="workspace-select max-w-full"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  >
                    <option value="">All customers</option>
                    {s.clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company || c.name}
                      </option>
                    ))}
                  </ModernSelect>
                )}
              </div>
            </div>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-56 animate-pulse rounded-2xl border bg-muted" />
                ))}
              </div>
            ) : filtered.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => navigateWorkspace(w.id)}
                    className="workspace-card group flex flex-col overflow-hidden rounded-2xl border bg-card text-left transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                  >
                    <div
                      className={`workspace-card-cover flex items-center justify-between px-5 py-5 ${w.kind === "territory" ? "bg-primary/8" : "bg-muted/70"}`}
                    >
                      <span className="flex size-11 items-center justify-center rounded-xl border border-primary/10 bg-card text-primary">
                        {w.kind === "territory" ? (
                          <MapPin className="size-5" />
                        ) : (
                          <Building2 className="size-5" />
                        )}
                      </span>
                      <span className="rounded-full border border-primary/10 bg-card/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {w.kind === "territory" ? "Workspace" : "Community"}
                        {w.state ? " · " + w.state : ""}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="truncate text-xs text-muted-foreground">
                        {companyName(w.clientId)}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold tracking-tight">{w.name}</h3>
                      <p className="mt-1 min-h-5 text-xs text-muted-foreground">
                        {w.parentId
                          ? "In " + (rows.find((p) => p.id === w.parentId)?.name || "territory")
                          : live.filter((x) => x.parentId === w.id).length + " communities"}
                      </p>
                      <div className="mt-6 flex items-center justify-between border-t pt-4">
                        <div className="flex gap-4 text-xs">
                          <span>
                            <strong className="mr-1 text-sm">{w.caseCount}</strong>
                            <span className="text-muted-foreground">cases</span>
                          </span>
                          <span>
                            <strong className="mr-1 text-sm">{w.openCount}</strong>
                            <span className="text-muted-foreground">open</span>
                          </span>
                        </div>
                        <ArrowUpRight className="size-4 text-primary transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="workspace-empty flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
                <span className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                  <Layers3 className="size-7" />
                </span>
                <h3 className="text-xl font-semibold">
                  {live.length ? "No matching workspaces" : "Build your first workspace"}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {live.length
                    ? "Try another search or customer filter."
                    : owner
                      ? "Create a workspace for a territory or market, then open it to add communities."
                      : "Your assigned workspaces will appear here once the owner sets up your access."}
                </p>
                {owner && !live.length && (
                  <Button className="mt-6" onClick={openCreate}>
                    <Plus className="mr-2 size-4" />
                    Create your first workspace
                  </Button>
                )}
                {live.length > 0 && (
                  <Button
                    className="mt-5"
                    variant="outline"
                    onClick={() => {
                      setFilter("");
                      setKind("all");
                      setCompany("");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </section>
          {owner && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card px-6 py-5">
              <div className="flex items-center gap-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-primary">
                  <Users className="size-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">The right people, the right access</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Manage regional and community access, or add a customer login.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setDialog("contact")}>
                  Add login
                </Button>
                <Button variant="outline" onClick={() => setDialog("access")}>
                  Customer access
                  <ChevronRight className="ml-2 size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" className="-ml-3" onClick={() => navigateWorkspace("")}>
              <ArrowLeft className="mr-2 size-4" />
              All workspaces
            </Button>
            <p className="text-xs text-muted-foreground">
              {active ? companyName(active.clientId) + " / " + active.kind : "Awaiting assignment"}{" "}
              · {cases.length} cases
            </p>
          </div>
          {active?.kind === "community" && (
            <button
              className="text-sm font-medium text-primary"
              onClick={() => navigateWorkspace(active.parentId)}
            >
              ← {rows.find((w) => w.id === active.parentId)?.name || "Parent workspace"}
            </button>
          )}
          {active?.kind === "territory" && (
            <section className="rounded-2xl border bg-card p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Communities in {active.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Workspace → Community → Case files
                  </p>
                </div>
                {owner && !active.archived && (
                  <Button
                    onClick={() => {
                      setEdit("");
                      setForm({
                        name: "",
                        clientId: active.clientId,
                        kind: "community",
                        parentId: active.id,
                        state: active.state,
                      });
                      setDialog("create");
                    }}
                  >
                    <Plus className="mr-2 size-4" />
                    Add community
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {rows
                  .filter((w) => w.parentId === active.id && (!w.archived || owner))
                  .map((w) => (
                    <button
                      key={w.id}
                      onClick={() => navigateWorkspace(w.id)}
                      className="rounded-xl border p-5 text-left transition hover:border-primary"
                    >
                      <Building2 className="mb-3 size-5 text-primary" />
                      <h3 className="font-semibold">
                        {w.name}
                        {w.archived ? " (archived)" : ""}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {w.caseCount} cases · Open community →
                      </p>
                    </button>
                  ))}
              </div>
              {!rows.some((w) => w.parentId === active.id) && (
                <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No communities yet.
                  {owner
                    ? " Use Add community to create one inside this workspace."
                    : " Communities will appear here when assigned."}
                </p>
              )}
            </section>
          )}
          <section className="overflow-hidden rounded-2xl border bg-card">
            <div className="border-b px-6 py-5">
              <h2 className="text-lg font-semibold">{active ? active.name : "Unassigned cases"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {active
                  ? active.kind === "territory"
                    ? "All case files from the communities in this workspace."
                    : "Case files assigned to this community."
                  : "Assign these case files to the right community."}
              </p>
            </div>
            <div className="p-5 sm:p-6">
              {owner && cases.length > 0 && (
                <div className="mb-4 space-y-2 rounded-xl border bg-muted/30 p-3">
                  <p className="text-sm">Move selected cases ({selection.length}, maximum 200)</p>
                  <ModernSelect
                    aria-label="Bulk destination workspace"
                    className="workspace-select"
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
                  </ModernSelect>
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
                      setDialog("create");
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
                    Edit {active.kind === "community" ? "community" : "workspace"}
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive"
                    disabled={busy}
                    onClick={() => {
                      if (
                        confirm(
                          `Permanently delete ${active.kind === "community" ? "community" : "workspace"} “${active.name}”? Cases and child communities must be deleted first.`,
                        )
                      )
                        void action(async () => {
                          await api(`/workspaces/${active.id}`, {
                            method: "DELETE",
                            body: { updatedAt: active.updatedAt },
                          });
                          navigateWorkspace(active.parentId || "");
                        });
                    }}
                  >
                    Delete {active.kind === "community" ? "community" : "workspace"}
                  </Button>
                </div>
              )}
              {cases.length === 0 ? (
                <div className="flex flex-col items-center px-5 py-14 text-center">
                  <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <FolderOpen className="size-6" />
                  </span>
                  <h3 className="font-semibold">
                    {active ? "No cases here yet" : "You’re all organized"}
                  </h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    {active
                      ? "Case files assigned to this community will appear here."
                      : "There are no case files waiting for a workspace assignment."}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {cases.map((c) => (
                    <div key={c.id} className="flex items-center gap-4 py-4">
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
                      <Link to="/cases/$id" params={{ id: c.id }} className="min-w-0 flex-1">
                        <span className="font-medium text-primary">{c.number}</span>
                        <span className="block text-sm">
                          {c.residentName} · {c.community || c.residentAddress}
                        </span>
                      </Link>
                      <StatusBadge value={c.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
      {owner && (
        <>
          <Dialog
            open={dialog === "create"}
            onOpenChange={(v) => {
              if (!v && !busy) setDialog(null);
            }}
          >
            <DialogContent className="workspace-dialog max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
              <DialogHeader>
                <DialogTitle>
                  {edit
                    ? form.kind === "community"
                      ? "Edit community"
                      : "Edit workspace"
                    : form.kind === "community"
                      ? "Add a community"
                      : "Create a workspace"}
                </DialogTitle>
                <DialogDescription>
                  {edit
                    ? "Update the name and state for this workspace."
                    : form.kind === "community"
                      ? "This community belongs to the workspace you opened."
                      : "After saving, open this workspace to add its communities."}
                </DialogDescription>
              </DialogHeader>{" "}
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(async () => {
                    await api("/workspaces/" + (edit || "new"), {
                      method: "PUT",
                      body: { ...form, updatedAt: edit ? editVersion : undefined },
                    });
                    setDialog(null);
                    setEdit("");
                    setForm({ name: "", clientId: "", kind: "territory", parentId: "", state: "" });
                  });
                }}
              >
                <label className="block text-sm">
                  Customer company
                  <ModernSelect
                    required
                    disabled={!!edit || form.kind === "community"}
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
                  </ModernSelect>
                </label>
                <div className="rounded-xl border bg-primary/5 p-4 text-sm">
                  <p className="font-semibold">
                    {form.kind === "community"
                      ? "Community inside a workspace"
                      : "Workspace for a territory / market"}
                  </p>
                  {form.kind === "community" && (
                    <p className="mt-1 text-muted-foreground">
                      Workspace: {rows.find((w) => w.id === form.parentId)?.name}
                    </p>
                  )}
                </div>
                <label className="block text-sm">
                  {form.kind === "community" ? "Community name" : "Workspace name"}
                  <Input
                    required
                    aria-label="Workspace name"
                    placeholder="Workspace name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  State abbreviation <span className="text-muted-foreground">(optional)</span>
                  <Input
                    maxLength={2}
                    aria-label="Workspace state"
                    placeholder="State abbreviation (optional)"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                  />
                </label>
                <Button disabled={busy}>
                  {form.kind === "community" ? "Save community" : "Save workspace"}
                </Button>
                {edit && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEdit("");
                      setForm({
                        name: "",
                        clientId: "",
                        kind: "territory",
                        parentId: "",
                        state: "",
                      });
                    }}
                  >
                    Cancel edit
                  </Button>
                )}
              </form>
            </DialogContent>
          </Dialog>
          <Dialog
            open={dialog === "access"}
            onOpenChange={(v) => {
              if (!v && !busy) setDialog(null);
            }}
          >
            <DialogContent className="workspace-dialog max-h-[90vh] overflow-y-auto sm:max-w-[580px]">
              <DialogHeader>
                <DialogTitle>Customer workspace access</DialogTitle>
                <DialogDescription>
                  Choose a person and the territories or communities they can access.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <ModernSelect
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
                </ModernSelect>
                {user?.role === "customer" && (
                  <ModernSelect
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
                  </ModernSelect>
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
                          {w.name} · {w.kind === "territory" ? "Workspace" : "Community"}
                        </label>
                      ))}
                  </div>
                )}
                {user?.role === "customer" && !s.clients.some(c=>c.primaryUserId===user.id) && <Button variant="outline" onClick={()=>setDialog("login")}>Edit extra login details</Button>}
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
            </DialogContent>
          </Dialog>
          <Dialog open={dialog === "login"} onOpenChange={open=>!open && setDialog(null)}><DialogContent><DialogHeader><DialogTitle>Extra customer login</DialogTitle></DialogHeader>{user && <CustomerLoginEditor key={user.id+user.updatedAt} user={user} onSaved={()=>setDialog(null)}/>}</DialogContent></Dialog>
          <Dialog
            open={dialog === "contact"}
            onOpenChange={(v) => {
              if (!v && !busy) setDialog(null);
            }}
          >
            <DialogContent className="workspace-dialog max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
              <DialogHeader>
                <DialogTitle>Add extra customer login</DialogTitle>
                <DialogDescription>
                  Connect another person to an existing customer company.
                </DialogDescription>
              </DialogHeader>{" "}
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(async () => {
                    await api("/users", { method: "POST", body: { ...contact, role: "customer" } });
                    setDialog(null);
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
                <ModernSelect
                  required
                  aria-label="Contact customer company"
                  className="w-full rounded border bg-background p-2"
                  value={contact.clientId}
                  onChange={(e) => setContact({ ...contact, clientId: e.target.value })}
                >
                  <option value="">Select existing customer company</option>
                  {s.clients.filter(c=>c.primaryUserId).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company || c.name}
                    </option>
                  ))}
                </ModernSelect>
                {(["name", "email", "username", "password", "phone"] as const).map((k) => (
                  <label key={k} className="block text-sm">
                    {
                      {
                        name: "Full name",
                        email: "Email address",
                        username: "Username",
                        password: "Password",
                        phone: "Phone (optional)",
                      }[k]
                    }
                    <Input
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
                  </label>
                ))}
                <p className="text-xs text-muted-foreground">
                  New linked logins start with no case access. Assign their territories or
                  communities above.
                </p>
                <Button disabled={busy}>Create customer login</Button>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
