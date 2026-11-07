import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { PageHeader, Panel } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { useStore, fmtDate } from "@/lib/store";
export const Route = createFileRoute("/_authenticated/notifications")({ component: Page });
function Page() {
  const s = useStore();
  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Case updates, invoices, appointments and new messages."
        actions={
          <Button variant="outline" onClick={() => s.markAllRead()}>
            <CheckCheck />
            Mark all read
          </Button>
        }
      />
      <Panel>
        <div className="divide-y">
          {s.notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 p-5 ${n.read ? "" : "bg-primary/5"}`}
            >
              <Bell className="mt-1 size-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{n.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">{fmtDate(n.at)}</p>
                {n.link && (
                  <Link
                    className="mt-2 inline-block text-sm text-primary"
                    to={n.link}
                    onClick={() => s.markRead(n.id)}
                  >
                    View update
                  </Link>
                )}
              </div>
              {!n.read && (
                <Button size="sm" variant="ghost" onClick={() => s.markRead(n.id)}>
                  Mark read
                </Button>
              )}
            </div>
          ))}
          {!s.notifications.length && (
            <p className="p-12 text-center text-sm text-muted-foreground">You're all caught up.</p>
          )}
        </div>
      </Panel>
    </>
  );
}
