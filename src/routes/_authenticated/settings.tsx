import { PaymentMode } from "@/components/lf/payment-mode";
import { can } from "@/lib/access";
import { ModernSelect } from "@/components/ui/modern-select";
import { IncomingEmailSettings } from "@/components/lf/incoming-email-settings";
import { CompanyBranding } from "@/components/lf/company-branding";
import { EmailSettings } from "@/components/lf/email-settings";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Link2,
  ShieldCheck,
  Trash2,
  Plus,
  UserRound,
  Palette,
  Building2,
  CreditCard,
  Mail,
  HardDrive,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import { PageHeader, Panel } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe, useStore, uid } from "@/lib/store";
import { api } from "@/lib/api";
import { ThemePicker } from "@/components/lf/theme-picker";
import { ThemeToggle } from "@/components/lf/theme-provider";
import type { CustomField } from "@/lib/domain";
export const Route = createFileRoute("/_authenticated/settings")({ component: Page });
function Page() {
  const me = useMe(),
    s = useStore();
  const [section, setSection] = useState("account");
  const sections = [
    {
      id: "account",
      label: "My account",
      description: "Profile and sign-in security",
      icon: UserRound,
      visible: true,
    },
    {
      id: "appearance",
      label: "Appearance",
      description: "Theme and display preferences",
      icon: Palette,
      visible: true,
    },
    {
      id: "company",
      label: "Company",
      description: "Branding, logo and reports",
      icon: Building2,
      visible: can(me, "company.manage"),
    },
    {
      id: "payments",
      label: "Payments",
      description: "Stripe sandbox and live mode",
      icon: CreditCard,
      visible: me?.role === "owner" && can(me, "settings.manage"),
    },
    {
      id: "email",
      label: "Email",
      description: "Sending and receiving messages",
      icon: Mail,
      visible: can(me, "settings.manage"),
    },
    {
      id: "storage",
      label: "File storage",
      description: "Dropbox connection and uploads",
      icon: HardDrive,
      visible: can(me, "settings.manage"),
    },
    {
      id: "fields",
      label: "Case fields",
      description: "Additional information on cases",
      icon: SlidersHorizontal,
      visible: can(me, "settings.manage"),
    },
  ].filter((item) => item.visible);
  const currentSection = sections.find((item) => item.id === section) || sections[0];
  const activeSection = currentSection.id;
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
    if (can(me, "settings.manage"))
      void api("/integrations/dropbox")
        .then(setConnection)
        .catch((e) => setIntegrationError(e.message));
  }, [me?.role]);
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Make LegalFlow work the way you do." />
      <div className="grid items-start gap-6 xl:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="rounded-2xl border bg-card p-3 xl:sticky xl:top-6">
          <p className="px-3 pb-3 pt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Preferences & connections
          </p>
          <nav aria-label="Settings categories" className="flex gap-1 overflow-x-auto xl:flex-col">
            {sections.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={activeSection === item.id ? "page" : undefined}
                  onClick={() => setSection(item.id)}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors xl:w-full ${activeSection === item.id ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1 font-medium">{item.label}</span>
                  {activeSection === item.id && <ChevronRight className="size-4 hidden xl:block" />}
                </button>
              );
            })}
          </nav>
          <p className="mt-4 hidden border-t px-3 pt-4 text-xs leading-relaxed text-muted-foreground xl:block">
            Your account and appearance are personal. Company connections apply across the
            workspace.
          </p>
        </aside>
        <section className="min-w-0 space-y-5" aria-label="Selected settings category">
          <header className="flex items-center gap-4 rounded-2xl border bg-card px-5 py-5 sm:px-7">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <currentSection.icon className="size-6" />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{currentSection.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{currentSection.description}</p>
            </div>
          </header>
          <div hidden={activeSection !== "account"} className="max-w-3xl space-y-5">
            <Panel title="My account">
              <form
                className="space-y-5 p-5 sm:p-7"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (busy) return;
                  setBusy(true);
                  try {
                    await api("/auth/profile", {
                      method: "PATCH",
                      body: {
                        name,
                        phone,
                        ...(newPassword ? { currentPassword, newPassword } : {}),
                      },
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
                  <Input
                    id="profile-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {me?.email} · @{me?.username}
                </p>
                <div className="border-t pt-5">
                  <h3 className="font-medium">Change password</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Leave these fields empty to keep your current password.
                  </p>
                </div>
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
          </div>
          <div hidden={activeSection !== "appearance"} className="space-y-5">
            <Panel title="Appearance">
              <div className="flex items-center justify-between p-5">
                <p className="text-sm text-muted-foreground">
                  Choose light or dark mode for this device.
                </p>
                <ThemeToggle />
              </div>
              <ThemePicker />
            </Panel>
          </div>
          <div hidden={activeSection !== "company"} className="space-y-5">
            {can(me, "company.manage") && <CompanyBranding />}
          </div>
          <div hidden={activeSection !== "payments"} className="space-y-5">
            {me?.role === "owner" && can(me, "settings.manage") && <PaymentMode settings />}
          </div>
          <div hidden={activeSection !== "email"} className="space-y-5">
            {can(me, "settings.manage") && (
              <>
                <EmailSettings />
                <IncomingEmailSettings />
              </>
            )}
          </div>
          <div hidden={activeSection !== "storage"} className="space-y-5">
            {can(me, "settings.manage") && (
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
                  {integrationError && (
                    <p className="text-sm text-destructive">{integrationError}</p>
                  )}
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
          <div hidden={activeSection !== "fields"} className="space-y-5">
            {can(me, "settings.manage") && (
              <Panel title="Case custom fields">
                <div className="space-y-4 p-5">
                  {s.customFields.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between border-b pb-3 text-sm"
                    >
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
                    <ModernSelect
                      aria-label="Field type"
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={fieldType}
                      onChange={(e) => setFieldType(e.target.value as CustomField["type"])}
                    >
                      {["text", "number", "date", "checkbox", "email", "phone", "textarea"].map(
                        (t) => (
                          <option key={t}>{t}</option>
                        ),
                      )}
                    </ModernSelect>
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
        </section>
      </div>
    </div>
  );
}
