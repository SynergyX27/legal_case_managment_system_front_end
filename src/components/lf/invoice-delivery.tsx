import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Invoice } from "@/lib/domain";
import { api } from "@/lib/api";
export function InvoiceDelivery({ invoice: i, editable }: { invoice: Invoice; editable: boolean }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function run(action: string) {
    const tab = action === "print" ? window.open("about:blank", "_blank") : null;
    if (tab) tab.opener = null;
    setBusy(true);
    try {
      if (action === "share") {
        const r = await api<{ url: string }>(`/invoices/${i.id}/public-link`, { method: "POST" });
        await navigator.clipboard.writeText(r.url);
        toast.success("Private invoice link copied. No sign-in required.");
        return;
      }
      if (action === "revoke") {
        await api(`/invoices/${i.id}/public-links`, { method: "DELETE" });
        toast.success(
          "Previous public invoice links disabled. Send or copy a new link when needed.",
        );
        return;
      }
      if (["invoice", "payment", "message"].includes(action)) {
        await api(`/invoices/${i.id}/email`, { method: "POST", body: { mode: action, message } });
        toast.success("Email queued for the customer");
        return;
      }
      const path =
        action === "bundle" ? `/cases/${i.caseId}/invoices/pdf` : `/invoices/${i.id}/pdf`;
      const r = await fetch(`/api${path}`, { credentials: "same-origin" });
      if (!r.ok) throw new Error((await r.json()).error || "Could not create PDF");
      const url = URL.createObjectURL(await r.blob());
      if (tab) {
        tab.location.href = url;
        toast.info("Use the PDF viewer’s Print button to print.");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download =
          r.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || "invoice.pdf";
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (e) {
      tab?.close();
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
      <p className="text-xs text-muted-foreground">{i.template || "Invoice"} · PDF and delivery</p>
      <div className="flex flex-wrap gap-2">
        {[
          ["pdf", "Download PDF"],
          ["print", "Print"],
          ["bundle", "All invoices for this case (PDF)"],
        ].map(([action, label]) => (
          <Button
            key={action}
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => run(action)}
          >
            {label}
          </Button>
        ))}
      </div>
      {editable && i.status !== "Draft" && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run("share")}>
              Copy private invoice link
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Disable all previous public links for this invoice? Send a new link afterward if the customer still needs access. This does not cancel a Stripe checkout already opened.",
                  )
                )
                  void run("revoke");
              }}
            >
              Disable previous links
            </Button>
          </div>
          <Input
            aria-label="Invoice email message"
            placeholder="Optional message to the customer"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {[
              ["invoice", "Email PDF"],
              ["payment", "Send payment link"],
              ["message", "Send regular email"],
            ]
              .filter(([action]) => action !== "payment" || ["Sent", "Overdue"].includes(i.status))
              .map(([action, label]) => (
                <Button
                  key={action}
                  variant="secondary"
                  size="sm"
                  disabled={busy || (action === "message" && !message.trim())}
                  onClick={() => run(action)}
                >
                  {label}
                </Button>
              ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Sent to the customer’s registered email. The private invoice page opens without sign-in
            and includes Pay, Print and Download buttons. Links expire after 90 days.
          </p>
        </>
      )}
    </div>
  );
}
