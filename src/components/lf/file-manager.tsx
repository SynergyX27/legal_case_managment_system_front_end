import "@/styles/file-manager.css";
import { visualTone } from "@/lib/visual-tone";
import { can } from "@/lib/access";
import { CaseCamera } from "./case-camera";
import { useEffect, useState, useRef } from "react";
import {
  Folder,
  FileText,
  ImageIcon,
  Film,
  Search,
  ChevronRight,
  Upload,
  Camera,
  Download,
  Check,
  LayoutGrid,
  List,
  MoreHorizontal,
  ArrowUpRight,
  FolderOpen,
  MapPin,
  Files,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useMe, useStore } from "@/lib/store";
import type { Attachment } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModernSelect } from "@/components/ui/modern-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  enqueueFiles,
  pendingUploads,
  subscribeUploads,
  retryUploads,
  discardUpload,
  type PendingUpload,
} from "@/lib/file-upload-queue";
type FolderRow = {
  id: string;
  number: string;
  tenant: string;
  address: string;
  community: string;
  files: number;
};
type Collection = {
  id: string;
  name: string;
  section: "docs" | "visuals";
  code?: string;
  files: number;
  pending: number;
};
export function FileManager({
  caseId: initialCase,
  initialCollection,
  capture = false,
  initialApproval = "",
}: {
  caseId?: string;
  initialCollection?: string;
  capture?: boolean;
  initialApproval?: string;
}) {
  const me = useMe(),
    refresh = useStore((s) => s.refresh),
    internal = me?.role !== "customer",
    reviewer = me?.roleProfile
      ? can(me, "files.approve")
      : ["owner", "manager"].includes(me?.role || "");
  const [folder, setFolder] = useState(initialCase || ""),
    [collection, setCollection] = useState(initialCollection || ""),
    [folders, setFolders] = useState<FolderRow[]>([]),
    [collections, setCollections] = useState<Collection[]>([]),
    [caseInfo, setCaseInfo] = useState<any>(),
    [files, setFiles] = useState<Attachment[]>([]),
    [query, setQuery] = useState(""),
    [offset, setOffset] = useState(0),
    [more, setMore] = useState(false),
    [loading, setLoading] = useState(false),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState<string[]>([]),
    [grid, setGrid] = useState(true),
    [approval, setApproval] = useState(initialApproval),
    [preview, setPreview] = useState<Attachment | null>(null),
    [pending, setPending] = useState<PendingUpload[]>([]),
    [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<{
      action: string;
      file?: Attachment;
      group?: Collection;
    } | null>(null),
    [name, setName] = useState(""),
    [section, setSection] = useState("docs"),
    [destination, setDestination] = useState("");
  const [camera, setCamera] = useState(false),
    [mediaError, setMediaError] = useState(false);
  useEffect(() => setMediaError(false), [preview?.id]);
  useEffect(() => {
    if (capture && initialCollection && internal) setCamera(true);
  }, [capture, initialCollection, internal]);
  const fileInput = useRef<HTMLInputElement>(null),
    cameraInput = useRef<HTMLInputElement>(null),
    replaceInput = useRef<HTMLInputElement>(null),
    replacement = useRef<Attachment | null>(null);
  useEffect(() => {
    setFolder(initialCase || "");
    setCollection(initialCollection || "");
    setApproval(initialApproval);
  }, [initialCase, initialCollection, initialApproval]);
  useEffect(() => {
    if (!me?.id) return;
    let alive = true;
    const update = () =>
      void pendingUploads(me.id)
        .then((rows) => alive && setPending(rows))
        .catch(() => {});
    update();
    const unsub = subscribeUploads(update);
    return () => {
      alive = false;
      unsub();
    };
  }, [me?.id]);
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        if (!folder) {
          const r = await api(
            `/file-manager/folders?q=${encodeURIComponent(query)}&offset=${offset}`,
          );
          if (live) {
            setFolders(r.folders);
            setMore(r.hasMore);
          }
        } else {
          const groups = await api(`/file-manager/cases/${folder}/collections`);
          if (!live) return;
          setCollections(groups.collections);
          setCaseInfo(groups.case);
          if (collection) {
            const r = await api(
              `/file-manager/cases/${folder}/files?collectionId=${encodeURIComponent(collection)}&q=${encodeURIComponent(query)}&approval=${approval}&offset=${offset}`,
            );
            if (live) {
              setFiles(r.files);
              setMore(r.hasMore);
            }
          } else {
            setFiles([]);
            setMore(false);
          }
        }
      } catch (e) {
        if (live) {
          setFiles([]);
          setFolders([]);
          setCollections([]);
          setCaseInfo(undefined);
          toast.error((e as Error).message);
        }
      } finally {
        if (live) setLoading(false);
      }
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [folder, collection, query, approval, offset, revision]);
  useEffect(() => {
    if (!folder) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== "hidden") setRevision((v) => v + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, [folder]);
  const reload = () => {
    setRevision((v) => v + 1);
    setSelected([]);
    void refresh();
  };
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const unsub = subscribeUploads(() => {
      clearTimeout(timer);
      timer = setTimeout(() => setRevision((v) => v + 1), 1800);
    });
    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, []);
  const go = (id: string, group = "") => {
    setFolder(id);
    setCollection(group);
    setQuery("");
    setOffset(0);
    setSelected([]);
    setApproval("");
  };
  async function upload(chosen: FileList | null) {
    if (!chosen?.length || !me || !folder || !collection) return;
    try {
      await enqueueFiles(me.id, folder, collection, Array.from(chosen));
      toast.success("Files saved to the upload queue");
    } catch (e) {
      toast.error("Could not save all pending files. Check device storage.");
    }
  }
  async function replace(file: File) {
    const old = replacement.current;
    if (!old || !folder) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("caseId", folder);
      form.append("collectionId", old.collectionId || collection);
      form.append("replaceId", old.id);
      form.append("updatedAt", old.updatedAt || "");
      form.append("file", file);
      await api("/documents", {
        method: "POST",
        body: form,
        headers: { "X-Upload-Id": crypto.randomUUID() },
      });
      reload();
      toast.success("Replacement uploaded for review");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      replacement.current = null;
    }
  }
  async function update(
    action: string,
    targets: Attachment[] = files.filter((f) => selected.includes(f.id)),
  ) {
    setBusy(true);
    try {
      await api("/file-manager/files", {
        method: "PATCH",
        body: {
          files: targets.map((f) => ({ id: f.id, updatedAt: f.updatedAt })),
          action,
          ...(action === "rename" ? { name } : {}),
          ...(action === "move" ? { collectionId: destination } : {}),
        },
      });
      setDialog(null);
      reload();
      toast.success("Files updated");
    } catch (e) {
      toast.error((e as Error).message);
      reload();
    } finally {
      setBusy(false);
    }
  }
  async function confirmDialog() {
    if (!dialog) return;
    setBusy(true);
    try {
      if (dialog.action === "delete-selected") {
        for (const f of files.filter((f) => selected.includes(f.id)))
          await api(`/documents/${f.id}`, { method: "DELETE", body: { updatedAt: f.updatedAt } });
      } else if (dialog.action === "delete") {
        await api(`/documents/${dialog.file!.id}`, { method: "DELETE" });
      } else if (["collection", "new-collection"].includes(dialog.action)) {
        await api(`/file-manager/collections/${dialog.group?.id || "new"}`, {
          method: "PUT",
          body: { name, section },
        });
      } else if (dialog.action === "delete-collection") {
        await api(`/file-manager/collections/${dialog.group!.id}`, { method: "DELETE" });
      } else {
        return await update(dialog.action, dialog.file ? [dialog.file] : undefined);
      }
      setDialog(null);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function edit(action: string, file?: Attachment, group?: Collection) {
    setDialog({ action, file, group });
    setName(file?.name || group?.name || "");
    setSection(group?.section || "docs");
    setDestination(collections[0]?.id || "");
  }
  const current = collections.find((c) => c.id === collection),
    queue = pending.filter((p) => p.caseId === folder),
    icon = (file: Attachment) =>
      file.type === "image" ? <ImageIcon /> : file.type === "video" ? <Film /> : <FileText />;
  return (
    <div className={`fm-page space-y-5 ${initialCase ? "is-embedded" : ""}`}>
      <div className="fm-heading flex flex-wrap items-center justify-between gap-3">
        <div className="fm-heading-copy">
          <p className="fm-eyebrow">
            <FolderOpen size={15} />
            {folder ? "CASE FILE LIBRARY" : "YOUR CASE LIBRARY"}
          </p>
          <div className="fm-breadcrumb flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {!initialCase && (
              <Button variant="link" onClick={() => go("")}>
                All case folders
              </Button>
            )}
            {folder && (
              <>
                <ChevronRight className="size-4" />
                <Button variant="link" onClick={() => go(folder)}>
                  {caseInfo?.number || "Case folder"}
                </Button>
              </>
            )}
            {current && (
              <>
                <ChevronRight className="size-4" />
                <span>{current.name}</span>
              </>
            )}
          </div>
          <h2 className="text-2xl font-semibold">
            {current?.name || (caseInfo?.number && folder)
              ? current?.name || caseInfo.number
              : "File Manager"}
          </h2>
          {!folder && (
            <p className="fm-description">
              Every case has a place. Find documents, photos and fieldwork in one organized library.
            </p>
          )}
          {folder && (
            <p className="fm-description text-sm text-muted-foreground">
              {caseInfo?.tenant} · {caseInfo?.address}
            </p>
          )}
        </div>
        <div className="fm-heading-actions flex flex-wrap gap-2">
          <div className="fm-heading-art" aria-hidden="true">
            <span />
            <FolderOpen />
            <Files />
          </div>
          {folder && !collection && me?.role === "owner" && (
            <Button variant="outline" onClick={() => edit("new-collection")}>
              Add collection
            </Button>
          )}
          {folder && collection && internal && (!me?.roleProfile || can(me, "files.upload")) && (
            <>
              <Button disabled={busy} onClick={() => fileInput.current?.click()}>
                <Upload className="size-4" />
                Upload files
              </Button>
              <Button disabled={busy} variant="outline" onClick={() => setCamera(true)}>
                <Camera className="size-4" />
                Take photo
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="fm-toolbar flex flex-wrap gap-2 rounded-xl border bg-card p-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            aria-label={folder ? "Search files" : "Search case folders"}
            className="pl-9"
            placeholder={
              folder ? "Search filenames…" : "Search case number, reference, tenant or address…"
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOffset(0);
              setSelected([]);
            }}
          />
        </div>
        {collection && internal && (
          <ModernSelect
            aria-label="Approval filter"
            value={approval}
            onChange={(e) => {
              setApproval(e.target.value);
              setOffset(0);
              setSelected([]);
            }}
          >
            <option value="">All review statuses</option>
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </ModernSelect>
        )}
        {(!folder || collection) && (
          <div className="fm-view-switch" role="group" aria-label="Display layout">
            <Button
              variant="ghost"
              aria-label="Grid view"
              aria-pressed={grid}
              onClick={() => setGrid(true)}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant="ghost"
              aria-label="List view"
              aria-pressed={!grid}
              onClick={() => setGrid(false)}
            >
              <List className="size-4" />
            </Button>
          </div>
        )}
        <Button variant="outline" onClick={reload}>
          <RefreshCw size={15} /> Refresh
        </Button>
      </div>
      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading files…
        </p>
      )}
      {!folder && (
        <>
          <div className="fm-section-label">
            <div>
              <h3>Case folders</h3>
              <p>
                {loading
                  ? "Loading your library…"
                  : `${folders.length} folders on this page · ${folders.reduce((n, f) => n + Number(f.files || 0), 0)} files in these folders`}
              </p>
            </div>
            <span className="fm-private-note">
              <ShieldCheck size={14} /> Permission-based access
            </span>
          </div>
          <div className={`fm-folder-layout ${grid ? "" : "is-list"}`}>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => go(f.id)}
                className="fm-folder"
                data-tone={visualTone(f.id)}
              >
                <div className="fm-folder-top">
                  <span className="fm-folder-art" aria-hidden="true">
                    <FolderOpen />
                  </span>
                  <span className="fm-count">
                    {f.files} {f.files === 1 ? "file" : "files"}
                  </span>
                </div>
                <div className="fm-folder-copy">
                  <h3 title={f.number}>{f.number}</h3>
                  <p className="fm-tenant">{f.tenant || f.community || "Case folder"}</p>
                  <p className="fm-address" title={f.address}>
                    <MapPin size={12} />
                    <span>{f.address || "No address"}</span>
                  </p>
                </div>
                <div className="fm-folder-footer">
                  <span>{f.files ? "Explore files" : "Ready for files"}</span>
                  <ArrowUpRight size={16} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      {folder && !collection && (
        <div className="fm-collections">
          {(["docs", "visuals"] as const).map((group) => {
            const groups = collections.filter((c) => c.section === group),
              shown = groups.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
            const GroupIcon = group === "docs" ? FileText : Camera;
            return (
              <section key={group} className="fm-collection-section" data-section={group}>
                <header>
                  <div className="fm-section-symbol">
                    <GroupIcon size={24} />
                  </div>
                  <div>
                    <h3>{group === "docs" ? "DOCS" : "VISUALS"}</h3>
                    <p>
                      {group === "docs"
                        ? "Legal paperwork & supporting records"
                        : "On-site photos & field evidence"}
                    </p>
                  </div>
                  <span className="fm-count">
                    {groups.reduce((n, c) => n + Number(c.files || 0), 0)} files
                  </span>
                </header>
                <div className="fm-collection-grid">
                  {shown.map((c) => (
                    <div key={c.id} className="fm-collection-tile" data-tone={visualTone(c.id)}>
                      <button className="fm-collection-open" onClick={() => go(folder, c.id)}>
                        <span className="fm-collection-icon">
                          {group === "docs" ? <FileText size={22} /> : <ImageIcon size={22} />}
                        </span>
                        <span className="fm-collection-title">{c.name}</span>
                        <span className="fm-collection-meta">
                          {c.files ? `${c.files} files` : "No files yet"}
                          {!!c.pending && <span className="fm-pending">{c.pending} pending</span>}
                        </span>
                        <ChevronRight className="fm-collection-arrow" size={16} />
                      </button>
                      {me?.role === "owner" && (
                        <Button
                          className="fm-collection-menu"
                          variant="ghost"
                          size="icon"
                          aria-label={`Manage ${c.name}`}
                          onClick={() => edit("collection", undefined, c)}
                        >
                          <MoreHorizontal size={16} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {!shown.length && <p className="fm-no-collections">No matching collections.</p>}
              </section>
            );
          })}
        </div>
      )}
      {!!queue.length && (
        <section className="rounded-xl border bg-card p-4">
          <h3 className="font-medium">Upload queue · {queue.length} remaining</h3>
          <p className="my-2 text-xs text-muted-foreground">
            Saved on this device. Uploads retry while LegalFlow is open and connected. New files
            require office approval.
          </p>
          {queue.map((p) => (
            <div key={p.id} className="flex items-center gap-2 border-t py-2 text-xs">
              <span className="min-w-0 flex-1 truncate">
                {p.name} · {p.state}
                {p.error ? ` · ${p.error}` : ""}
              </span>
              {p.state !== "uploading" && (
                <Button variant="ghost" size="sm" onClick={() => void discardUpload(p.id, me!.id)}>
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => void retryUploads(me!.id)}>
            Retry pending uploads
          </Button>
        </section>
      )}
      {collection && internal && !!files.length && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              aria-label="Select files on this page"
              checked={selected.length === files.length}
              onChange={(e) => setSelected(e.target.checked ? files.map((f) => f.id) : [])}
            />
            Select this page
          </label>
          <span className="text-sm">{selected.length} selected</span>
          {!!selected.length && (
            <>
              <Button disabled={busy} variant="destructive" onClick={() => edit("delete-selected")}>
                Delete selected
              </Button>
              <Button disabled={busy} variant="outline" onClick={() => edit("move")}>
                Move to collection
              </Button>
              {reviewer && (
                <>
                  <Button disabled={busy} onClick={() => void update("approve")}>
                    <Check className="size-4" />
                    Approve selected
                  </Button>
                  <Button disabled={busy} variant="outline" onClick={() => void update("reject")}>
                    Reject selected
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      )}
      {collection && (
        <div className={grid ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
          {files.map((f) => (
            <article key={f.id} className="overflow-hidden rounded-xl border bg-card">
              <button
                onClick={() => setPreview(f)}
                className={
                  grid
                    ? "flex h-40 w-full items-center justify-center bg-muted/30 text-primary"
                    : "flex w-full items-center gap-3 p-4 text-left"
                }
              >
                {f.type === "image" ? (
                  <img
                    src={f.url}
                    alt={f.name}
                    loading="lazy"
                    className={grid ? "h-full w-full object-cover" : "size-12 rounded object-cover"}
                  />
                ) : (
                  icon(f)
                )}
                {!grid && <span className="truncate">{f.name}</span>}
              </button>
              <div className="space-y-3 p-4">
                <div className="flex items-start gap-2">
                  {internal && (
                    <input
                      type="checkbox"
                      aria-label={`Select ${f.name}`}
                      checked={selected.includes(f.id)}
                      onChange={() =>
                        setSelected((a) =>
                          a.includes(f.id) ? a.filter((id) => id !== f.id) : [...a, f.id],
                        )
                      }
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={f.name}>
                      {f.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {f.size} · {f.uploadedBy}
                    </p>
                  </div>
                </div>
                {internal && (
                  <p
                    className={`text-xs ${f.approval === "approved" ? "text-emerald-600" : "text-amber-600"}`}
                  >
                    {f.approval === "pending" ? "Pending office review" : f.approval}
                  </p>
                )}
                <div className="flex flex-wrap gap-1">
                  <Button variant="outline" size="sm" onClick={() => setPreview(f)}>
                    Open
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={`${f.url}?download=1`} download={f.name}>
                      <Download className="size-3" />
                      Download
                    </a>
                  </Button>
                  {internal && (
                    <Button variant="ghost" size="sm" onClick={() => edit("rename", f)}>
                      Manage
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && ((!folder && !folders.length) || (collection && !files.length)) && (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          {folder ? "No files in this collection." : "No matching case folders."}
        </p>
      )}
      {(!folder || collection) && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            disabled={!offset || loading}
            onClick={() => {
              setOffset((v) => Math.max(0, v - (folder ? 50 : 30)));
              setSelected([]);
            }}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {Math.floor(offset / (folder ? 50 : 30)) + 1}
          </span>
          <Button
            variant="outline"
            disabled={!more || loading}
            onClick={() => {
              setOffset((v) => v + (folder ? 50 : 30));
              setSelected([]);
            }}
          >
            Next
          </Button>
        </div>
      )}
      {camera && me && (
        <CaseCamera
          userId={me.id}
          caseId={folder}
          collectionId={collection}
          onClose={() => setCamera(false)}
        />
      )}
      <input
        ref={fileInput}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          void upload(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void upload(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceInput}
        type="file"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) void replace(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[95vh] overflow-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="break-all pr-5">{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview &&
            (preview.type === "image" ? (
              <img
                src={preview.url}
                alt={preview.name}
                className="max-h-[70vh] w-full object-contain"
              />
            ) : preview.type === "video" ? (
              <video
                key={preview.id}
                src={preview.url}
                controls
                playsInline
                className="max-h-[70vh] w-full"
              />
            ) : preview.type === "pdf" ? (
              <iframe
                title={preview.name}
                src={preview.url}
                className="h-[65vh] w-full rounded border"
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Download this file to open it in its related application.
              </p>
            ))}
          {mediaError && (
            <p className="text-sm text-muted-foreground">
              Preview is unavailable for this format. Download the file or open it in its related
              app.
            </p>
          )}
          <Button asChild>
            <a href={`${preview?.url}?download=1`} download={preview?.name}>
              Download file
            </a>
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={!!dialog} onOpenChange={(o) => !busy && !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.action === "rename"
                ? "Manage file"
                : dialog?.action === "move"
                  ? "Move selected files"
                  : dialog?.action.includes("collection")
                    ? "Manage collection"
                    : "Delete file?"}
            </DialogTitle>
          </DialogHeader>
          {["rename", "collection", "new-collection"].includes(dialog?.action || "") && (
            <Input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          )}{" "}
          {["collection", "new-collection"].includes(dialog?.action || "") && (
            <>
              <p className="text-xs text-muted-foreground">
                Collection names apply to every case. Files are still stored separately inside each
                case.
              </p>
              <ModernSelect value={section} onChange={(e) => setSection(e.target.value)}>
                <option value="docs">DOCS</option>
                <option value="visuals">VISUALS</option>
              </ModernSelect>
            </>
          )}
          {dialog?.action === "move" && (
            <ModernSelect
              aria-label="Destination collection"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.section.toUpperCase()} · {c.name}
                </option>
              ))}
            </ModernSelect>
          )}
          {["delete", "delete-selected", "delete-collection"].includes(dialog?.action || "") && (
            <p className="text-sm">
              {["delete", "delete-selected"].includes(dialog?.action || "")
                ? `This permanently deletes ${dialog?.action === "delete-selected" ? selected.length : "the"} file(s) from the case and Dropbox.`
                : "This removes the collection for all cases. It must contain no files."}
            </p>
          )}
          {dialog?.action === "rename" && (
            <>
              <p className="text-xs text-muted-foreground">
                Renaming, moving or replacing a file requires fresh approval.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={busy} onClick={() => edit("move", dialog.file)}>
                  Move
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    replacement.current = dialog.file!;
                    setDialog(null);
                    replaceInput.current?.click();
                  }}
                >
                  Replace file
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => edit("delete", dialog.file)}
                >
                  Delete
                </Button>
                {reviewer && (
                  <>
                    <Button disabled={busy} onClick={() => void update("approve", [dialog.file!])}>
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => void update("reject", [dialog.file!])}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
          {dialog?.action === "collection" && (
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => edit("delete-collection", undefined, dialog.group)}
            >
              Delete collection
            </Button>
          )}
          <Button
            disabled={
              busy ||
              (["rename", "collection", "new-collection"].includes(dialog?.action || "") &&
                !name.trim())
            }
            onClick={() => void confirmDialog()}
          >
            {busy
              ? "Saving…"
              : ["delete", "delete-selected", "delete-collection"].includes(dialog?.action || "")
                ? "Confirm deletion"
                : "Save"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
