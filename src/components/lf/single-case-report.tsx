import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { caseCsv } from "@/lib/case-management";
import { useStore } from "@/lib/store";
import type { Case } from "@/lib/domain";
import { toast } from "sonner";
export function SingleCaseReport({ row }: { row: Case }) {
  const s = useStore(),
    [open, setOpen] = useState(false),
    [photoId, setPhoto] = useState(""),
    [to, setTo] = useState(""),
    [busy, setBusy] = useState(false);
  const run = async (kind: string) => {
    const popup = kind === "print" ? window.open("", "_blank") : null;
    if (kind === "print" && !popup) {
      toast.error("Allow popups to open the printable PDF.");
      return;
    }
    setBusy(true);
    try {
      if (kind === "email") {
        await api(`/cases/${row.id}/report/email`, {
          method: "POST",
          body: { to, photoId: photoId || undefined },
        });
        toast.success("Report queued for email delivery");
        return;
      }
      let blob: Blob;
      if (kind === "csv")
        blob = new Blob([caseCsv([row], s.clients, s.users, s.invoices)], {
          type: "text/csv;charset=utf-8",
        });
      else {
        const r = await fetch(
          `/api/cases/${row.id}/report/pdf${photoId ? "?photoId=" + encodeURIComponent(photoId) : ""}`,
          { credentials: "same-origin", signal: AbortSignal.timeout(120000) },
        );
        if (!r.ok) throw new Error((await r.json()).error || "Report could not be generated");
        blob = await r.blob();
      }
      const url = URL.createObjectURL(blob);
      if (popup) {
        popup.location.href = url;
        toast.info("Use the PDF viewer’s print button to print this report.");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `case-${row.number.replace(/[^a-zA-Z0-9_-]/g, "_")}.${kind === "csv" ? "csv" : "pdf"}`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 300000);
    } catch (e) {
      popup?.close();
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(!open)}>
        Case report
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className="space-y-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Case report · {row.number}</DialogTitle>
          </DialogHeader>
          <label className="block text-sm">
            Cover photo
            <select
              className="mt-1 w-full rounded border bg-background p-2"
              value={photoId}
              onChange={(e) => setPhoto(e.target.value)}
            >
              <option value="">Use property address cover</option>
              {row.attachments
                .filter((a) => /\.(png|jpe?g)$/i.test(a.name))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            Choose a PNG / JPEG up to 5 MB. Company details come from owner Settings.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => run("pdf")}>
              Download PDF
            </Button>
            <Button disabled={busy} variant="outline" onClick={() => run("print")}>
              Print PDF
            </Button>
            <Button disabled={busy} variant="outline" onClick={() => run("csv")}>
              Export CSV
            </Button>
          </div>
          <Input
            aria-label="Report email recipient"
            type="email"
            placeholder="Recipient email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Button disabled={busy || !to} onClick={() => run("email")}>
            Email report
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
