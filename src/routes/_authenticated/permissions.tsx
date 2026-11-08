import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { useMe, useStore, type RolePermissions } from "@/lib/store";
import type { User } from "@/lib/domain";
export const Route = createFileRoute("/_authenticated/permissions")({ component: Page });
const actions = [
  ["cases.create", "Create cases", "Create a case in a modal or on the full page."],
  ["cases.edit", "Edit cases", "Update assigned case details and status."],
  ["cases.delete", "Delete cases", "Delete assigned cases without documents or invoices."],
  ["invoices.view", "View invoices", "Read invoices for assigned cases."],
  ["invoices.create", "Create invoices", "Create additional invoices for assigned cases."],
  [
    "invoices.edit",
    "Edit invoices",
    "Edit, publish or record manual payment on assigned invoices.",
  ],
  [
    "invoices.delete",
    "Delete unpaid invoices",
    "Remove an unpaid invoice when no active payment exists.",
  ],
] as const;
function RoleCard({ value }: { value: RolePermissions }) {
  const save = useStore((s) => s.saveRolePermissions);
  const [draft, setDraft] = useState({ ...value.permissions });
  const [busy, setBusy] = useState(false);
  const changed = actions.some(([key]) => !!draft[key] !== !!value.permissions[key]);
  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold capitalize">
        {value.role === "staff" ? "Staff members" : "Managers"}
      </h2>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        Default permissions for this role. Individual exceptions appear below.
      </p>
      <div className="divide-y">
        {actions.map(([key, label, description]) => (
          <label key={key} className="flex cursor-pointer items-start gap-3 py-4">
            <input
              className="mt-1 size-4 accent-primary"
              type="checkbox"
              checked={!!draft[key]}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
              disabled={busy}
            />
            <span>
              <span className="block text-sm font-medium">{label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
            </span>
          </label>
        ))}
      </div>
      <Button
        className="mt-5 w-full"
        disabled={busy || !changed}
        onClick={async () => {
          setBusy(true);
          try {
            if (await save({ ...value, permissions: draft }))
              toast.success("Role permissions saved");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving…" : "Save role permissions"}
      </Button>
    </section>
  );
}
function PersonCard({ user, defaults }: { user: User; defaults: Record<string, boolean> }) {
  const save = useStore((s) => s.updateUserAccess);
  const [overrides, setOverrides] = useState({ ...user.permissionOverrides });
  const [busy, setBusy] = useState(false);
  const changed = JSON.stringify(overrides) !== JSON.stringify(user.permissionOverrides ?? {});
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h3 className="font-semibold">{user.name}</h3>
      <p className="mb-4 mt-1 text-xs text-muted-foreground capitalize">
        {user.role} · {user.username}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-3 rounded-xl border p-3">
            <label className="text-sm" htmlFor={`${user.id}-${key}`}>
              {label}
            </label>
            <select
              id={`${user.id}-${key}`}
              className="rounded-lg border bg-card p-2 text-xs"
              value={overrides[key] === undefined ? "inherit" : String(overrides[key])}
              disabled={busy}
              onChange={(e) => {
                const v = { ...overrides };
                if (e.target.value === "inherit") delete v[key];
                else v[key] = e.target.value === "true";
                setOverrides(v);
              }}
            >
              <option value="inherit">Role default ({defaults[key] ? "allowed" : "denied"})</option>
              <option value="true">Allow</option>
              <option value="false">Deny</option>
            </select>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <Button variant="outline" disabled={busy} onClick={() => setOverrides({})}>
          Use role defaults
        </Button>
        <Button
          disabled={!changed || busy}
          onClick={async () => {
            setBusy(true);
            try {
              const error = await save(user.id, {
                role: user.role,
                status: user.status,
                managerId: user.managerId,
                permissions: overrides,
                updatedAt: user.updatedAt,
              });
              if (error) toast.error(error);
              else toast.success("Individual permissions saved");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Save exceptions"}
        </Button>
      </div>
    </section>
  );
}
function Page() {
  const me = useMe(),
    s = useStore();
  const [selected, setSelected] = useState("");
  if (me?.role !== "owner") return <PageHeader title="Owner access required" />;
  const people = s.users.filter((u) => ["manager", "staff"].includes(u.role));
  const person = people.find((u) => u.id === selected);
  return (
    <>
      <PageHeader
        title="Permissions"
        subtitle="Choose what managers and staff can do. Access is checked by the server on every request."
        actions={
          <Button asChild variant="outline">
            <Link to="/users">
              <Users />
              Manage people & teams
            </Link>
          </Button>
        }
      />
      <div className="mb-6 flex gap-3 rounded-2xl border bg-accent/40 p-5">
        <ShieldCheck className="size-5 shrink-0 text-primary" />
        <div className="text-sm">
          <p className="font-medium">Owner access is always enabled</p>
          <p className="mt-1 text-muted-foreground">
            Permissions apply only to assigned cases. Only owners create team accounts, assign staff
            to managers, and change access. Invoice creation, editing or deletion also enables
            invoice viewing.
          </p>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {s.rolePermissions.map((value) => (
          <RoleCard key={value.role + value.updatedAt} value={value} />
        ))}
      </div>
      <section className="mt-8 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Individual exceptions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep role defaults or override specific permissions for one person. Saved exceptions
            take priority over role defaults.
          </p>
        </div>
        <select
          aria-label="Choose team member"
          className="h-11 w-full rounded-xl border bg-card px-3 text-sm sm:max-w-md"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Select manager or staff member</option>
          {people.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {u.role}
              {u.status === "Inactive" ? " (inactive)" : ""}
            </option>
          ))}
        </select>
        {person && (
          <PersonCard
            key={person.id + person.updatedAt}
            user={person}
            defaults={s.rolePermissions.find((r) => r.role === person.role)?.permissions ?? {}}
          />
        )}
      </section>
    </>
  );
}
