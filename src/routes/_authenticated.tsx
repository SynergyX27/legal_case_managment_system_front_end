import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/lf/app-shell";
import { useStore, useMe, canAccess } from "@/lib/store";
import { useStoreHydrated } from "@/lib/use-hydrated-store";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const ready = useStoreHydrated();
  const session = useStore((s) => s.sessionUserId);
  const nav = useNavigate();
  const me = useMe();
  const section = useRouterState({ select: (s) => s.location.pathname.split("/")[1] });
  useEffect(() => {
    if (ready && (!session || me?.status !== "Active")) nav({ to: "/" });
  }, [ready, session, me?.status, nav]);
  if (!ready || !session || me?.status !== "Active") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading LegalFlow…
      </div>
    );
  }
  return (
    <AppShell>
      {canAccess(me, section === "ai-insights" ? "ai" : section) ? (
        <Outlet />
      ) : (
        <p className="rounded-lg border bg-card p-8">
          This section is not available for your role.
        </p>
      )}
    </AppShell>
  );
}
