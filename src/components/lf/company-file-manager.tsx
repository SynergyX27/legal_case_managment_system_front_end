import { useEffect, useRef, useState } from "react";
import {
  Folder,
  FolderPlus,
  Upload,
  ArrowLeft,
  Pencil,
  Trash2,
  ShieldCheck,
  Grid2X2,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileTypeBadge } from "./file-type-badge";
import { useMe, useStore } from "@/lib/store";
import { can } from "@/lib/access";
import { api } from "@/lib/api";
import type { Attachment } from "@/lib/domain";
import "@/styles/file-manager.css";
type FolderRow = { id: string; name: string; files?: number; updatedAt: string };
type Action =
  | { kind: "create" }
  | { kind: "rename" | "deleteFolder"; folder: FolderRow }
  | { kind: "editFile" | "deleteFile"; file: Attachment };
export function CompanyFileManager() {
  const me = useMe(),
    store = useStore(),
    [folderId, setFolderId] = useState<string | null>(null),
    [folder, setFolder] = useState<FolderRow | null>(null),
    [folders, setFolders] = useState<FolderRow[]>([]),
    [files, setFiles] = useState<Attachment[]>([]),
    [unfiled, setUnfiled] = useState(0),
    [q, setQ] = useState(""),
    [offset, setOffset] = useState(0),
    [more, setMore] = useState(false),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [action, setAction] = useState<Action | null>(null),
    [name, setName] = useState(""),
    [preview, setPreview] = useState<Attachment | null>(null),
    [list, setList] = useState(false),
    [moveSearch, setMoveSearch] = useState(""),
    [destinations, setDestinations] = useState<FolderRow[]>([]),
    [destination, setDestination] = useState<string | undefined>();
  const input = useRef<HTMLInputElement>(null),
    allowed = me?.role === "owner" && can(me, "company.manage");
  useEffect(() => {
    if (!allowed) return;
    let live = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q, offset: String(offset) });
      if (folderId !== null) params.set("folderId", folderId);
      api((folderId === null ? "/company-folders?" : "/company-files?") + params)
        .then((r) => {
          if (!live) return;
          setMore(r.hasMore);
          setFolders(r.folders || []);
          setFiles(r.files || []);
          setFolder(r.folder || null);
          setUnfiled(r.unfiled || 0);
        })
        .catch((e) => {
          if (live) setError(e.message);
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [folderId, q, offset, revision, allowed, me?.id]);
  useEffect(() => {
    if (action?.kind !== "editFile") return;
    let live = true;
    const t = setTimeout(
      () =>
        api("/company-folders?" + new URLSearchParams({ q: moveSearch }))
          .then((r) => {
            if (live) setDestinations(r.folders);
          })
          .catch((e) => toast.error(e.message)),
      200,
    );
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [action, moveSearch]);
  function navigate(id: string | null) {
    if (busy) return;
    setFolderId(id);
    setQ("");
    setOffset(0);
    setFiles([]);
    setFolders([]);
    setFolder(null);
  }
  function open(a: Action) {
    setAction(a);
    setName("folder" in a ? a.folder.name : "file" in a ? a.file.name : "");
    setDestination(undefined);
    setMoveSearch("");
  }
  async function mutate(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await store.refresh();
      setRevision((v) => v + 1);
      setAction(null);
      toast.success("Company library updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  function download(f: Attachment) {
    if (!f.url) return;
    const a = document.createElement("a");
    a.href = f.url + "?download=1";
    a.download = f.name;
    a.click();
  }
  if (!allowed) return <h1>Company file access required</h1>;
  return (
    <div className="company-library fm-page">
      <header className="fm-heading">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Private company library
          </p>
          <h1 className="text-2xl font-bold">
            {folderId === null ? "Company files" : folder?.name || "Unfiled"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <ShieldCheck className="mr-2 inline size-4" />
            Company administrators only · separate from case files
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {folderId === null ? (
            <Button disabled={busy} onClick={() => open({ kind: "create" })}>
              <FolderPlus />
              New folder
            </Button>
          ) : (
            <>
              <Button variant="outline" disabled={busy} onClick={() => navigate(null)}>
                <ArrowLeft />
                Company folders
              </Button>
              <Button disabled={busy || loading || !!error} onClick={() => input.current?.click()}>
                <Upload />
                {busy ? "Uploading…" : "Upload files"}
              </Button>
            </>
          )}
        </div>
      </header>
      <input
        ref={input}
        type="file"
        multiple
        className="hidden"
        aria-label="Upload company files"
        onChange={async (e) => {
          const selected = Array.from(e.target.files || []);
          e.target.value = "";
          if (!selected.length || folderId === null || busy) return;
          const id = me.id;
          setBusy(true);
          let count = 0;
          try {
            for (const file of selected) {
              if (useStore.getState().sessionUserId !== id)
                throw new Error("Session changed. Upload stopped");
              const body = new FormData();
              body.append("file", file);
              if (folderId) body.append("companyFolderId", folderId);
              await api("/company-files", {
                method: "POST",
                body,
                headers: { "X-Upload-Id": crypto.randomUUID(), "X-Upload-User": id },
              });
              count++;
            }
            toast.success(`${count} file(s) uploaded`);
          } catch (err) {
            toast.error(
              `${count} file(s) uploaded. ${err instanceof Error ? err.message : "Upload failed"}`,
            );
          } finally {
            await store.refresh();
            setRevision((v) => v + 1);
            setBusy(false);
          }
        }}
      />
      <div className="fm-toolbar my-5 flex flex-wrap gap-3">
        <Input
          aria-label="Search company library"
          placeholder={folderId === null ? "Search folders…" : "Search files in this folder…"}
          value={q}
          disabled={busy}
          onChange={(e) => {
            setQ(e.target.value);
            setOffset(0);
          }}
        />
        <Button variant="outline" disabled={busy} onClick={() => setRevision((v) => v + 1)}>
          Refresh
        </Button>
        {folderId !== null && (
          <Button variant="outline" aria-label="Toggle grid or list" onClick={() => setList(!list)}>
            {list ? <Grid2X2 /> : <List />}
          </Button>
        )}
      </div>
      {error ? (
        <p role="alert" className="rounded-xl border p-6 text-destructive">
          {error}
        </p>
      ) : loading ? (
        <p className="p-10 text-center text-muted-foreground">Loading company library…</p>
      ) : folderId === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {offset === 0 && (!q || "unfiled".includes(q.toLowerCase())) && (
            <article className="company-folder">
              <button disabled={busy} className="w-full text-left" onClick={() => navigate("")}>
                <span className="company-folder-icon">
                  <Folder />
                </span>
                <h2 className="font-semibold">Unfiled</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {unfiled} files · existing uploads kept here
                </p>
              </button>
            </article>
          )}
          {folders.map((f) => (
            <article className="company-folder" key={f.id}>
              <button disabled={busy} className="w-full text-left" onClick={() => navigate(f.id)}>
                <span className="company-folder-icon">
                  <Folder />
                </span>
                <h2 className="break-words font-semibold">{f.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{f.files} files</p>
              </button>
              <div className="mt-5 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => open({ kind: "rename", folder: f })}
                >
                  <Pencil />
                  Rename
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => open({ kind: "deleteFolder", folder: f })}
                >
                  <Trash2 />
                  Delete
                </Button>
              </div>
            </article>
          ))}
          {!folders.length && q && <p>No matching folders.</p>}
        </div>
      ) : (
        <>
          <div className={list ? "grid gap-3" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"}>
            {files.map((f) => (
              <article className="overflow-hidden rounded-2xl border bg-card" key={f.id}>
                <button
                  onClick={() => setPreview(f)}
                  className={
                    list
                      ? "flex w-full items-center gap-4 p-4 text-left"
                      : "flex min-h-40 w-full items-center justify-center bg-muted/40 p-6"
                  }
                >
                  <FileTypeBadge file={f} compact={list} />
                  {list && <span className="break-all font-semibold">{f.name}</span>}
                </button>
                <div className="p-4">
                  {!list && <h2 className="break-all font-semibold">{f.name}</h2>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {f.size} · {f.uploadedBy}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPreview(f)}>
                      Open
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => download(f)}>
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => open({ kind: "editFile", file: f })}
                    >
                      Organize
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => open({ kind: "deleteFile", file: f })}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!files.length && (
            <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
              {q ? "No matching files." : "This folder is empty. Upload files to get started."}
            </div>
          )}
        </>
      )}
      <div className="my-6 flex items-center justify-between">
        <Button
          variant="outline"
          disabled={busy || loading || offset === 0}
          onClick={() => setOffset((v) => Math.max(0, v - 50))}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">Page {offset / 50 + 1}</span>
        <Button
          variant="outline"
          disabled={busy || loading || !more}
          onClick={() => setOffset((v) => v + 50)}
        >
          Next
        </Button>
      </div>
      <Dialog open={!!action} onOpenChange={(v) => !v && !busy && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action?.kind === "create"
                ? "New company folder"
                : action?.kind === "rename"
                  ? "Rename folder"
                  : action?.kind === "editFile"
                    ? "Organize company file"
                    : "Confirm deletion"}
            </DialogTitle>
          </DialogHeader>
          {action && (action.kind === "deleteFolder" || action.kind === "deleteFile") ? (
            <p className="text-sm text-muted-foreground">
              {"folder" in action
                ? `Delete “${action.folder.name}”? The folder must be empty first.`
                : `Permanently delete “${action.file.name}”? This cannot be undone.`}
            </p>
          ) : (
            <Input
              aria-label="Name"
              value={name}
              maxLength={action?.kind === "editFile" ? 240 : 100}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          )}
          {action?.kind === "editFile" && (
            <div className="space-y-2">
              <p className="text-sm">Move to a different folder (optional)</p>
              <Input
                placeholder="Find destination folder…"
                value={moveSearch}
                onChange={(e) => setMoveSearch(e.target.value)}
              />
              <div className="max-h-48 overflow-auto rounded-xl border p-2">
                <Button
                  variant={destination === "" ? "secondary" : "ghost"}
                  onClick={() => setDestination("")}
                >
                  Unfiled
                </Button>
                {destinations.map((f) => (
                  <Button
                    className="w-full justify-start"
                    key={f.id}
                    variant={destination === f.id ? "secondary" : "ghost"}
                    onClick={() => setDestination(f.id)}
                  >
                    {f.name}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Keep the file extension. Search to find more folders.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button disabled={busy} variant="outline" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy || (!name.trim() && !action?.kind.startsWith("delete"))}
              variant={action?.kind.startsWith("delete") ? "destructive" : "default"}
              onClick={() =>
                mutate(async () => {
                  if (!action) return;
                  if (action.kind === "create")
                    await api("/company-folders", { method: "POST", body: { name } });
                  else if (action.kind === "rename")
                    await api(`/company-folders/${action.folder.id}`, {
                      method: "PATCH",
                      body: { name, updatedAt: action.folder.updatedAt },
                    });
                  else if (action.kind === "deleteFolder")
                    await api(`/company-folders/${action.folder.id}`, {
                      method: "DELETE",
                      body: { updatedAt: action.folder.updatedAt },
                    });
                  else if (action.kind === "deleteFile")
                    await api(`/company-files/${action.file.id}`, {
                      method: "DELETE",
                      body: { updatedAt: action.file.updatedAt },
                    });
                  else if (action.kind === "editFile")
                    await api(`/company-files/${action.file.id}`, {
                      method: "PATCH",
                      body: {
                        name,
                        updatedAt: action.file.updatedAt,
                        ...(destination !== undefined ? { folderId: destination } : {}),
                      },
                    });
                })
              }
            >
              {busy ? "Saving…" : action?.kind.startsWith("delete") ? "Delete" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="break-all">{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview && (
            <>
              {preview.type === "image" ? (
                <img
                  className="max-h-[65dvh] w-full object-contain"
                  src={preview.url}
                  alt={preview.name}
                />
              ) : preview.type === "video" ? (
                <video className="max-h-[65dvh] w-full" src={preview.url} controls />
              ) : preview.type === "pdf" ? (
                <iframe
                  title={preview.name}
                  className="h-[65dvh] w-full rounded-xl"
                  src={preview.url}
                />
              ) : (
                <div className="p-10 text-center">
                  <FileTypeBadge file={preview} />
                  <p className="mt-4">Download this file to open it in its application.</p>
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => download(preview)}>Download</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
