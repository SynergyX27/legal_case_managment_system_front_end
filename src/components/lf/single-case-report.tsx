import { ModernSelect } from "@/components/ui/modern-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, apiBlob } from "@/lib/api";
import type { Attachment, Case } from "@/lib/domain";
import { toast } from "sonner";
export function SingleCaseReport({ row, rows }: { row?: Case; rows?: Case[] }) {
  const selected = rows || (row ? [row] : []);
  row = selected[0];
  const [open, setOpen] = useState(false),
    [photoId, setPhoto] = useState(""),
    [to, setTo] = useState(""),
    [busy, setBusy] = useState(false),
    [downloadFormat, setDownloadFormat] = useState("pdf");
  const [photos, setPhotos] = useState<Attachment[]>([]),
    [photoOffset, setPhotoOffset] = useState(0),
    [morePhotos, setMorePhotos] = useState(false);
  useEffect(() => {
    if (!open || selected.length !== 1 || !row?.id) return;
    let live = true;
    void api(`/file-manager/cases/${row.id}/files?kind=image&offset=${photoOffset}`)
      .then((r) => {
        if (live) {
          setPhotos((p) => (photoOffset ? [...p, ...r.files] : r.files));
          setMorePhotos(r.hasMore);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [open, row?.id, selected.length, photoOffset]);
  const run = async (kind: string) => {
    const popup = kind === "print" ? window.open("", "_blank") : null;
    if (kind === "print" && !popup) {
      toast.error("Allow popups to open the printable PDF.");
      return;
    }
    setBusy(true);
    try {
      if (kind === "email") {
        await api("/reports/cases/export", {
          method: "POST",
          body: {
            to,
            caseIds: selected.map((c) => c.id),
            format: "pdf",
            photoId: selected.length === 1 ? photoId || undefined : undefined,
          },
        });
        toast.success("Report queued for email delivery");
        return;
      }
      const format = kind === "xlsx" ? "xlsx" : "pdf";
      const blob = await apiBlob("/reports/cases/export", {
        caseIds: selected.map((c) => c.id),
        format,
        photoId: selected.length === 1 ? photoId || undefined : undefined,
      });
      const url = URL.createObjectURL(blob);
      if (popup) {
        popup.location.href = url;
        toast.info("Use the PDF viewer’s print button to print this report.");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `case-reports-${selected.length}.${format}`;
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
        {rows ? `Reports · ${selected.length} cases` : "Case report"}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className="space-y-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Case reports · {selected.length === 1 ? row?.number : `${selected.length} selected`}
            </DialogTitle>
          </DialogHeader>
          <label className="block text-sm">
            Cover photo
            <ModernSelect
              className="mt-1 w-full rounded border bg-background p-2"
              disabled={selected.length !== 1}
              value={photoId}
              onChange={(e) => setPhoto(e.target.value)}
            >
              <option value="">Use property address cover</option>
              {photos
                .filter((a) => /\.(png|jpe?g)$/i.test(a.name))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </ModernSelect>
          </label>
          {morePhotos && (
            <Button variant="outline" disabled={busy} onClick={() => setPhotoOffset((v) => v + 50)}>
              More cover photos
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Company details come from owner Settings. Combined PDF: up to 25 cases, each starting on
            a new page. Excel: up to 200 cases.
          </p>
          <div className="flex flex-wrap gap-2">
            <ModernSelect
              aria-label="Download format"
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value)}
              disabled={busy}
            >
              <option value="pdf">PDF document</option>
              <option value="xlsx">Excel workbook (.xlsx)</option>
            </ModernSelect>
            <Button disabled={busy || !selected.length} onClick={() => run(downloadFormat)}>
              Download report
            </Button>
            <Button disabled={busy} variant="outline" onClick={() => run("print")}>
              Print PDF
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
