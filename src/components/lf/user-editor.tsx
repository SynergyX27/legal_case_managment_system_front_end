import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useStore, type UserInput } from "@/lib/store";
import type { Role } from "@/lib/domain";
export type UserDraft = UserInput & { confirmPassword: string };
export const blankUser = (role: Role = "customer"): UserDraft => ({
  name: "",
  email: "",
  username: "",
  password: "",
  confirmPassword: "",
  company: "",
  phone: "",
  address: "",
  title: "",
  role,
});
export function UserFields({
  value,
  onChange,
  customer = true,
}: {
  value: UserDraft;
  onChange: (value: UserDraft) => void;
  customer?: boolean;
}) {
  const [show, setShow] = useState(false);
  const field = (
    key: "name" | "email" | "username" | "company" | "phone" | "address" | "title",
    label: string,
    required = false,
    type = "text",
  ) => (
    <div className="space-y-2">
      <Label htmlFor={`user-${key}`}>{label}</Label>
      <Input
        id={`user-${key}`}
        required={required}
        type={type}
        value={value[key] ?? ""}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
        autoComplete={
          key === "email"
            ? "email"
            : key === "username"
              ? "username"
              : key === "phone"
                ? "tel"
                : key === "name"
                  ? "name"
                  : "off"
        }
      />
    </div>
  );
  return (
    <div className="user-fields grid gap-x-4 gap-y-4 sm:grid-cols-2">
      {field("name", "Full name", true)}
      {field("email", "Email address", true, "email")}
      {!customer && field("title", "Job title")}
      {field("phone", "Phone number", false, "tel")}
      {field("username", "Username", true)}
      {customer && <div className="sm:col-span-2">{field("address", "Customer address")}</div>}
      <div className="space-y-2">
        <Label htmlFor="user-password">Password</Label>
        <div className="relative">
          <Input
            id="user-password"
            required
            minLength={10}
            type={show ? "text" : "password"}
            value={value.password}
            autoComplete="new-password"
            onChange={(e) => onChange({ ...value, password: e.target.value })}
            className="pr-11"
          />
          <button
            type="button"
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-3 text-muted-foreground"
            onClick={() => setShow(!show)}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="user-confirm">Confirm password</Label>
        <Input
          id="user-confirm"
          required
          type="password"
          minLength={10}
          autoComplete="new-password"
          value={value.confirmPassword}
          onChange={(e) => onChange({ ...value, confirmPassword: e.target.value })}
        />
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground sm:col-span-2">
        Use at least 10 characters. Each person should have their own login.
      </p>
    </div>
  );
}
export function OwnerUserForm({
  defaultRole = "customer",
  onSaved,
  allowRoleSelection = true,
}: {
  defaultRole?: Role;
  onSaved: () => void;
  allowRoleSelection?: boolean;
}) {
  const s = useStore();
  const [draft, setDraft] = useState(() => blankUser(defaultRole)),
    [busy, setBusy] = useState(false);
  useEffect(() => setDraft(blankUser(defaultRole)), [defaultRole]);
  const role = draft.role ?? "customer";
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (draft.password !== draft.confirmPassword) return toast.error("Passwords do not match");
        setBusy(true);
        try {
          const error = await s.createUser(draft);
          if (error) toast.error(error);
          else {
            toast.success(
              `${role === "customer" ? "Customer profile and login" : "User login"} created`,
            );
            onSaved();
          }
        } catch {
          toast.error("Could not create this user");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="user-role">User role</Label>
        <select
          disabled={!allowRoleSelection}
          id="user-role"
          className="h-10 w-full rounded-xl border bg-card px-3 text-sm"
          value={role}
          onChange={(e) =>
            setDraft({ ...blankUser(e.target.value as Role), name: draft.name, email: draft.email })
          }
        >
          {(["owner", "manager", "staff", "customer"] as Role[]).map((role) => (
            <option key={role} value={role}>
              {role === "owner"
                ? "Owner"
                : role === "manager"
                  ? "Manager"
                  : role === "staff"
                    ? "Staff member"
                    : "Customer"}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Only an owner can create users or assign these roles.
        </p>
      </div>
      {role === "customer" && (
        <div className="space-y-2">
          <Label htmlFor="existing-customer">Customer profile</Label>
          <select
            id="existing-customer"
            className="h-10 w-full rounded-xl border bg-card px-3 text-sm"
            value={draft.clientId ?? ""}
            onChange={(e) => {
              const client = s.clients.find((c) => c.id === e.target.value);
              setDraft({
                ...draft,
                clientId: client?.id,
                name: client?.name ?? "",
                email: client?.email ?? "",
                company: client?.company ?? "",
                phone: client?.phone ?? "",
                address: client?.address ?? "",
              });
            }}
          >
            <option value="">Create a new customer</option>
            {s.clients
              .filter((c) => !s.users.some((u) => u.clientId === c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company} · {c.name}
                </option>
              ))}
          </select>
        </div>
      )}
      {role === "staff" && (
        <div className="space-y-2">
          <Label htmlFor="new-staff-manager">Responsible manager</Label>
          <select
            id="new-staff-manager"
            required
            className="h-10 w-full rounded-xl border bg-card px-3 text-sm"
            value={draft.managerId ?? ""}
            onChange={(e) => setDraft({ ...draft, managerId: e.target.value })}
          >
            <option value="">Select a manager</option>
            {s.users
              .filter((u) => u.role === "manager" && u.status === "Active")
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Create a manager account first. New cases will automatically use this manager.
          </p>
        </div>
      )}
      <UserFields value={draft} onChange={setDraft} customer={role === "customer"} />
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Creating…" : role === "customer" ? "Create customer & login" : "Create user"}
      </Button>
    </form>
  );
}
