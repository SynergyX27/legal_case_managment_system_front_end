import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/lf/app-shell";
import { useStore } from "@/lib/store";
import { useStoreHydrated } from "@/lib/use-hydrated-store";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const ready = useStoreHydrated();
  const session = useStore((s) => s.sessionUserId);
  const nav = useNavigate();
  useEffect(() => { if (ready && !session) nav({ to: "/" }); }, [ready, session, nav]);
  if (!ready || !session) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading LegalFlow…</div>;
  }
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
