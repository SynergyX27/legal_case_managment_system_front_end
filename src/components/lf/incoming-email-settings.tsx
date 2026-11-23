import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
export function IncomingEmailSettings() {
  const [v, setV] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = () =>
    api("/email/incoming/status")
      .then(setV)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="space-y-3 rounded-xl border bg-card p-6">
      <h2 className="font-semibold">Incoming customer email</h2>
      <p className="text-sm text-muted-foreground">
        Gmail IMAP receives replies to LegalFlow conversations. Configure IMAP credentials in the
        backend Render environment.
      </p>
      {v && (
        <>
          <p className="text-sm">
            {v.enabled ? "Enabled" : "Disabled"} · {v.host}
          </p>
          <p className="text-sm text-muted-foreground">
            Last successful check:{" "}
            {v.lastSync ? new Date(v.lastSync).toLocaleString() : "Not yet checked"}
          </p>
          <p className="text-sm text-muted-foreground">
            Attachments awaiting Dropbox: {v.pendingAttachments}
          </p>
          {v.lastError && <p className="text-sm text-destructive">Last error: {v.lastError}</p>}
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy || !v?.enabled}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await api("/email/incoming/sync", { method: "POST" });
              toast.success(
                r.busy
                  ? "A sync is already running"
                  : r.initialized
                    ? "Incoming mailbox initialized. New replies will now be imported."
                    : `Imported ${r.imported || 0} replies`,
              );
              await load();
            } catch (e) {
              toast.error((e as Error).message);
              await load();
            } finally {
              setBusy(false);
            }
          }}
        >
          Check incoming mail
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api("/email/incoming/retry-attachments", { method: "POST" });
              toast.success("Pending attachments queued for retry");
              await load();
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Retry pending attachments
        </Button>
      </div>
    </section>
  );
}
