import { EmailSettings } from "@/components/lf/email-settings";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link2, ShieldCheck, Trash2, Plus } from "lucide-react";
import { PageHeader, Panel } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe, useStore, uid } from "@/lib/store";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/lf/theme-provider";
import type { CustomField } from "@/lib/domain";
export const Route = createFileRoute("/_authenticated/settings")({ component: Page });
function Page() {
  const me = useMe(),
    s = useStore();
  const [name, setName] = useState(me?.name ?? ""),
    [phone, setPhone] = useState(me?.phone ?? ""),
    [currentPassword, setCurrent] = useState(""),
    [newPassword, setPassword] = useState(""),
    [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState<{
      configured: boolean;
      connected: boolean;
      redirectUri: string;
      root: string;
      maxFileMb: number;
    } | null>(null),
    [integrationError, setIntegrationError] = useState("");
  const [fieldName, setFieldName] = useState(""),
    [fieldType, setFieldType] = useState<CustomField["type"]>("text"),
    [required, setRequired] = useState(false);
  useEffect(() => {
    if (me?.role === "owner")
      void api("/integrations/dropbox")
        .then(setConnection)
        .catch((e) => setIntegrationError(e.message));
  }, [me?.role]);
  return (
    <>
      <PageHeader title="Settings" subtitle="Your account, appearance and company connections." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="My account">
          <form
            className="space-y-4 p-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              try {
                await api("/auth/profile", {
                  method: "PATCH",
                  body: { name, phone, ...(newPassword ? { currentPassword, newPassword } : {}) },
                });
                await s.refresh();
                setCurrent("");
                setPassword("");
                toast.success("Account updated");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full name</Label>
              <Input
                id="profile-name"
                value={name}
                required
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <p className="text-sm text-muted-foreground">
              {me?.email} · @{me?.username}
            </p>
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password (optional)</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                value={newPassword}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Changing your password signs out your other devices.
              </p>
            </div>
            <Button disabled={busy}>{busy ? "Saving…" : "Save account"}</Button>
          </form>
        </Panel>
        <div className="space-y-6">
          <Panel title="Appearance">
            <div className="flex items-center justify-between p-5">
              <p className="text-sm text-muted-foreground">
                Choose light or dark mode for this device.
              </p>
              <ThemeToggle />
            </div>
          </Panel>
          {me?.role === "owner" && (
            <Panel title="Dropbox document storage">
              <div className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" />
                  <span className="font-medium">
                    {connection?.connected
                      ? "Account connected"
                      : "Connect the company Dropbox account"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  All case and company documents use this connection. Offline access keeps uploads
                  working after the initial authorization.
                </p>
                {integrationError && <p className="text-sm text-destructive">{integrationError}</p>}
                {connection && (
                  <>
                    <p className="break-all text-xs text-muted-foreground">
                      OAuth redirect: {connection.redirectUri}
                      <br />
                      Folder: {connection.root} · Maximum file size: {connection.maxFileMb} MB
                    </p>
                    {!connection.configured && (
                      <p className="text-sm text-muted-foreground">
                        Add the app key and secret to the backend environment first.
                      </p>
                    )}
                  </>
                )}
                <Button
                  disabled={busy || !connection?.configured}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const r = await api<{ url: string }>("/integrations/dropbox/connect", {
                        method: "POST",
                      });
                      window.location.assign(r.url);
                    } catch (e) {
                      toast.error((e as Error).message);
                      setBusy(false);
                    }
                  }}
                >
                  <Link2 />
                  {connection?.connected ? "Reconnect Dropbox" : "Connect Dropbox"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Reconnect the same storage account to renew authorization. Existing documents
                  remain in the Dropbox account where they were uploaded.
                </p>
              </div>
            </Panel>
          )}
        </div>
        {me?.role === "owner" && <EmailSettings />}
        {me?.role === "owner" && (
          <Panel title="Case custom fields">
            <div className="space-y-4 p-5">
              {s.customFields.map((f) => (
                <div key={f.id} className="flex items-center justify-between border-b pb-3 text-sm">
                  <span>
                    {f.label}{" "}
                    <span className="text-muted-foreground">
                      ({f.type}
                      {f.required ? ", required" : ""})
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${f.label}`}
                    onClick={() => s.deleteCustomField(f.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await s.upsertCustomField({
                      id: uid("field"),
                      label: fieldName,
                      type: fieldType,
                      required,
                      options: [],
                    })
                  ) {
                    setFieldName("");
                    toast.success("Custom field added");
                  }
                }}
              >
                <Input
                  aria-label="Custom field name"
                  placeholder="Field name"
                  value={fieldName}
                  required
                  onChange={(e) => setFieldName(e.target.value)}
                />
                <select
                  aria-label="Field type"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value as CustomField["type"])}
                >
                  {["text", "number", "date", "checkbox", "email", "phone", "textarea"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <label className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={required}
                    onChange={(e) => setRequired(e.target.checked)}
                  />
                  Required
                </label>
                <Button variant="outline">
                  <Plus />
                  Add field
                </Button>
              </form>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}
