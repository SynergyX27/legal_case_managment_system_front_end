import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useMe, useStore, type RolePermissions } from "@/lib/store";
import { can } from "@/lib/access";
import {
  roleProfiles,
  roleLabel,
  permissionActions,
  permissionDefaults,
} from "@/lib/role-profiles";
import { PermissionChecklist } from "@/components/lf/permission-checklist";
import { PageHeader, Panel } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { ModernSelect } from "@/components/ui/modern-select";
import type { User } from "@/lib/domain";
export const Route = createFileRoute("/_authenticated/permissions")({ component: Page });
function Defaults({ value }: { value: RolePermissions }) {
  const s = useStore();
  const [draft, setDraft] = useState({ ...value.permissions }),
    [busy, setBusy] = useState(false);
  return (
    <Panel
      title={
        roleProfiles.find((p) => "profile_" + p.id === value.role)?.label ||
        value.role + " (legacy)"
      }
    >
      <div className="p-5 space-y-4">
        <PermissionChecklist
          baseRole={
            roleProfiles.find((p) => "profile_" + p.id === value.role)?.baseRole || value.role
          }
          defaults={value.permissions}
          overrides={draft}
          onChange={(v) => setDraft({ ...value.permissions, ...v })}
          disabled={busy}
        />
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              if (await s.saveRolePermissions({ ...value, permissions: draft }))
                toast.success("Role defaults saved. Personal exceptions remain unchanged.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Save role defaults
        </Button>
      </div>
    </Panel>
  );
}
function Person({ user }: { user: User }) {
  const s = useStore();
  const [overrides, setOverrides] = useState(user.permissionOverrides || {}),
    [busy, setBusy] = useState(false);
  return (
    <Panel title={user.name + " · " + roleLabel(user)}>
      <div className="p-5 space-y-4">
        <PermissionChecklist
          baseRole={user.role}
          defaults={permissionDefaults(user.roleProfile, s.rolePermissions, user.role)}
          overrides={overrides}
          onChange={setOverrides}
          disabled={busy}
        />
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const error = await s.updateUserAccess(user.id, {
                role: user.role,
                roleProfile: user.roleProfile,
                status: user.status,
                managerId: user.managerId,
                permissions: overrides,
                updatedAt: user.updatedAt,
              });
              if (error) toast.error(error);
              else toast.success("Personal permissions saved");
            } finally {
              setBusy(false);
            }
          }}
        >
          Save personal permissions
        </Button>
      </div>
    </Panel>
  );
}
function Page() {
  const s = useStore(),
    me = useMe();
  const [role, setRole] = useState("profile_manager"),
    [person, setPerson] = useState("");
  if (!can(me, "permissions.manage")) return <PageHeader title="Super Admin permission required" />;
  const value = s.rolePermissions.find((r) => r.role === role),
    user = s.users.find((u) => u.id === person);
  return (
    <>
      <PageHeader
        title="Roles & permissions"
        subtitle="Role defaults provide the starting permissions. Personal checkbox exceptions take priority."
        actions={
          <Button asChild variant="outline">
            <Link to="/users">People & access</Link>
          </Button>
        }
      />
      <p className="mb-5 rounded-xl border bg-card p-4 text-sm">
        Super Admin is protected. Changing a role default updates people who inherit it; explicit
        personal exceptions remain. Permissions never override case assignment or customer workspace
        boundaries. Full case reports also require legal-detail and financial-view access.
      </p>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <h2 className="font-semibold">Role defaults</h2>
          <ModernSelect
            aria-label="Choose role defaults"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {s.rolePermissions.map((r) => (
              <option key={r.role} value={r.role}>
                {roleProfiles.find((p) => "profile_" + p.id === r.role)?.label ||
                  r.role + " (legacy)"}
              </option>
            ))}
          </ModernSelect>
          {value && <Defaults key={value.role + value.updatedAt} value={value} />}
        </div>
        <div className="space-y-4">
          <h2 className="font-semibold">Individual permissions</h2>
          <ModernSelect
            aria-label="Choose person"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
          >
            <option value="">Select a person</option>
            {s.users
              .filter(
                (u) =>
                  u.role !== "customer" &&
                  !(u.role === "owner" && (!u.roleProfile || u.roleProfile === "super_admin")),
              )
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {roleLabel(u)}
                </option>
              ))}
          </ModernSelect>
          {user && <Person key={user.id + user.updatedAt} user={user} />}
        </div>
      </div>
    </>
  );
}
