import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Eye, FileText, Search, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileDrop } from "@/components/lf/case-form-dialog";
import { useMe, useStore, fmtDate } from "@/lib/store";
import type { Attachment } from "@/lib/domain";
export const Route = createFileRoute("/_authenticated/company-documents")({
  head: () => ({ meta: [{ title: "Company documents – LegalFlow" }] }),
  component: Page,
});
function Page() {
  const s = useStore(),
    me = useMe();
  const [upload, setUpload] = useState(false),
    [files, setFiles] = useState<Attachment[]>([]),
    [query, setQuery] = useState(""),
    [preview, setPreview] = useState<Attachment | null>(null),
    [deleting, setDeleting] = useState<Attachment | null>(null);
  const [saving, setSaving] = useState(false);
  if (me?.role !== "owner") return <PageHeader title="Owner access required" />;
  const rows = s.companyDocuments.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));
  const download = (file: Attachment) => {
    if (!file.url) return;
    const a = document.createElement("a");
    a.href = file.url + "?download=1";
    a.download = file.name;
    a.click();
  };
  return (
    <>
      <PageHeader
        title="Company documents"
        subtitle="An owner-only library for company files, separate from all case documents."
        actions={
          <Button
            onClick={() => {
              setFiles([]);
              setUpload(true);
            }}
          >
            <UploadCloud />
            Upload documents
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="metric-card">
          <p className="metric-label">Company documents</p>
          <p className="metric-value">{s.companyDocuments.length}</p>
          <p className="metric-footer">Stored independently of case files</p>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-7 text-primary" />
            <div>
              <p className="text-sm font-semibold">Owner access only</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Only the owner can access this library. Documents are stored in the company Dropbox
                account.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="records-toolbar mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            aria-label="Search company documents"
            placeholder="Search company files…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[650px] text-left">
          <thead>
            <tr>
              {["Document", "Uploaded by", "Date", "Size", "Actions"].map((h) => (
                <th className="px-5" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((f) => (
              <tr key={f.id}>
                <td className="px-5">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-accent p-3 text-primary">
                      <FileText className="size-4" />
                    </span>
                    <div>
                      <button
                        className="text-sm font-semibold text-primary"
                        onClick={() => setPreview(f)}
                      >
                        {f.name}
                      </button>
                      <p className="mt-1 text-xs uppercase text-muted-foreground">{f.type}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5">{f.uploadedBy}</td>
                <td className="px-5">{fmtDate(f.uploadedAt)}</td>
                <td className="px-5">{f.size}</td>
                <td className="px-5">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Preview ${f.name}`}
                      onClick={() => setPreview(f)}
                    >
                      <Eye />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Download ${f.name}`}
                      onClick={() => download(f)}
                    >
                      <Download />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${f.name}`}
                      onClick={() => setDeleting(f)}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="px-6 py-16 text-center">
            <FileText className="mx-auto mb-4 size-10 text-primary/40" />
            <h2 className="text-base font-semibold">
              {query ? "No matching company files" : "Keep your company documents together"}
            </h2>
            <p className="mb-5 mt-2 text-sm text-muted-foreground">
              {query
                ? "Try another filename."
                : "Upload policies, templates or other company documents here."}
            </p>
            {!query && (
              <Button
                variant="outline"
                onClick={() => {
                  setFiles([]);
                  setUpload(true);
                }}
              >
                Upload your first document
              </Button>
            )}
          </div>
        )}
      </div>
      <Dialog open={upload} onOpenChange={(value) => !saving && setUpload(value)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload company documents</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            These files belong to the company library and will not be linked to any case.
          </p>
          <FileDrop files={files} setFiles={setFiles} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpload(false)}>
              Cancel
            </Button>
            <Button
              disabled={saving || !files.length}
              onClick={async () => {
                if (saving) return;
                setSaving(true);
                try {
                  const error = await s.addCompanyDocuments(files);
                  if (error) toast.error(error);
                  else {
                    setUpload(false);
                    setFiles([]);
                    toast.success("Company documents saved");
                  }
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Uploading…" : "Save documents"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="break-all pr-5">{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview && (
            <>
              {preview.type === "image" &&
              preview.url?.startsWith("data:image/") &&
              !preview.url.startsWith("data:image/svg") ? (
                <img
                  className="max-h-96 w-full object-contain"
                  alt={preview.name}
                  src={preview.url}
                />
              ) : preview.type === "pdf" && preview.url?.startsWith("data:application/pdf") ? (
                <iframe
                  title={preview.name}
                  className="h-96 w-full rounded-xl border"
                  sandbox=""
                  src={preview.url}
                />
              ) : (
                <p className="rounded-xl bg-muted p-8 text-center text-sm text-muted-foreground">
                  Download this document to view its contents.
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setPreview(null)}>
                  Close
                </Button>
                <Button onClick={() => download(preview)}>
                  <Download />
                  Download
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete company document?</DialogTitle>
          </DialogHeader>
          <p className="break-words text-sm text-muted-foreground">
            {deleting?.name} will be permanently removed from the company library.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleting && !(await s.deleteCompanyDocument(deleting.id))) return;
                setDeleting(null);
                toast.success("Company document deleted");
              }}
            >
              Delete document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
