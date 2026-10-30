import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Scale, ShieldCheck, CalendarClock, FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/lf/ui-bits";
import { useStore } from "@/lib/store";
import { useStoreHydrated } from "@/lib/use-hydrated-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in – LegalFlow" },
      { name: "description", content: "Sign in to LegalFlow, the case management platform for legal service teams." },
      { property: "og:title", content: "Sign in – LegalFlow" },
      { property: "og:description", content: "Case files, service dates, documents and invoices for legal teams." },
    ],
  }),
  component: Login,
});

const demos = [
  { role: "Owner", email: "owner@legalflow.demo", desc: "Full access to every account" },
  { role: "Manager", email: "manager@legalflow.demo", desc: "Assigned accounts & cases" },
  { role: "Staff", email: "staff@legalflow.demo", desc: "Authorized cases only" },
];

function Login() {
  const ready = useStoreHydrated();
  const nav = useNavigate();
  const login = useStore((s) => s.login);
  const session = useStore((s) => s.sessionUserId);
  const [email, setEmail] = useState("owner@legalflow.demo");
  const [password, setPassword] = useState("password123");

  useEffect(() => { if (ready && session) nav({ to: "/dashboard" }); }, [ready, session, nav]);

  const submit = (e?: string) => {
    if (login(e ?? email, e ? "password123" : password)) {
      toast.success("Welcome back");
      nav({ to: "/dashboard" });
    } else toast.error("Invalid email or password");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <Logo light />
        <div className="max-w-md">
          <Scale className="mb-6 size-10 text-sidebar-primary" />
          <h1 className="font-display text-4xl font-medium leading-tight text-sidebar-accent-foreground">
            Every case, every service date, every invoice — in one ledger.
          </h1>
          <p className="mt-4 text-sidebar-foreground/80">Built for process servers, property managers and law firms who can't afford a missed deadline.</p>
          <ul className="mt-10 space-y-4 text-sm">
            {[[FileStack, "Spreadsheet-grade case files"], [CalendarClock, "Service dates synced to the calendar"], [ShieldCheck, "Role-based access for every account"]].map(([I, t]) => {
              const Icon = I as typeof Scale;
              return <li key={t as string} className="flex items-center gap-3"><Icon className="size-4 text-sidebar-primary" />{t as string}</li>;
            })}
          </ul>
        </div>
        <p className="text-xs text-sidebar-foreground/60">© 2026 LegalFlow · Prototype with demo data</p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="font-display text-2xl font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use your work email to continue.</p>
          <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div className="space-y-1.5"><Label htmlFor="email">Email address</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2"><Checkbox defaultChecked /> Remember me</label>
              <button type="button" className="text-info hover:underline" onClick={() => toast.info("Password reset link sent (demo)")}>Forgot password?</button>
            </div>
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
          <div className="mt-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Demo accounts · password123</p>
            <div className="space-y-2">
              {demos.map((d) => (
                <button key={d.email} onClick={() => submit(d.email)} className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:border-info/40 hover:bg-accent/50">
                  <div><div className="text-sm font-medium">{d.role}</div><div className="text-xs text-muted-foreground">{d.email}</div></div>
                  <span className="text-xs text-muted-foreground">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
