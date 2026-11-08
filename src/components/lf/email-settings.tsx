import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Panel } from "./ui-bits";
import { Button } from "@/components/ui/button";
interface DeliveryStatus {
  enabled: boolean;
  from: string;
  counts: Record<string, number>;
  lastError: string | null;
}
export function EmailSettings() {
  const [status, setStatus] = useState<DeliveryStatus | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = async () => {
    try {
      setStatus(await api("/email/status"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <Panel title="Automated emails">
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted-foreground">
          Clients receive case-opened, issued-invoice and payment emails. Completed payments also
          notify all active owners and the assigned case manager and staff member.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {status && (
          <>
            <p className="text-sm">
              <span className="font-medium">
                {status.enabled ? "Sending enabled" : "Sending disabled"}
              </span>
              {status.from && <> · {status.from}</>}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["pending", "sending", "sent", "failed"].map((key) => (
                <div key={key} className="rounded-xl border p-3">
                  <p className="text-xs capitalize text-muted-foreground">
                    {key === "sent" ? "SMTP accepted" : key}
                  </p>
                  <p className="mt-1 text-xl font-semibold">{status.counts[key] ?? 0}</p>
                </div>
              ))}
            </div>
            {status.lastError && (
              <p className="text-xs text-destructive">Last delivery error: {status.lastError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              SMTP settings are managed in the backend environment. Delivery retries run
              automatically; drafts do not send email. “SMTP accepted” confirms acceptance by the
              mail server, not inbox delivery.
            </p>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void refresh()}>
            Refresh status
          </Button>
          <Button
            variant="outline"
            disabled={busy || !status?.enabled}
            onClick={async () => {
              setBusy(true);
              try {
                await api("/email/verify", { method: "POST" });
                toast.success("SMTP connection verified; no email was sent");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Please wait…" : "Check SMTP connection"}
          </Button>
          <Button
            disabled={busy || !status?.enabled || !status.counts["failed"]}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await api<{ count: number }>("/email/retry", { method: "POST" });
                toast.success(`${result.count} failed emails queued again`);
                await refresh();
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Retry failed emails
          </Button>
        </div>
      </div>
    </Panel>
  );
}
