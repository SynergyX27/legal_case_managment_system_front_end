import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { UploadCloud, X, FileText, Film, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMe, useStore, uid } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { CASE_TYPES, PRIORITIES, STATUSES, iso, type Attachment, type Case } from "@/lib/mock-data";

function F({ label, children, span }: { label: string; children: ReactNode; span?: boolean }) {
  return <div className={span ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-lg border p-4">
      <legend className="px-1 text-sm font-semibold"><span className="mr-2 text-info">0{n}</span>{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
function Sel({ value, onChange, items }: { value: string; onChange: (v: string) => void; items: { v: string; l: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
      <SelectContent>{items.map((i) => <SelectItem key={i.v} value={i.v}>{i.l}</SelectItem>)}</SelectContent>
    </Select>
  );
}

const fileKind = (f: File): Attachment["type"] =>
  f.type.startsWith("image") ? "image" : f.type.startsWith("video") ? "video" : f.name.endsWith(".pdf") ? "pdf" : /\.docx?$/.test(f.name) ? "word" : /\.xlsx?$/.test(f.name) ? "excel" : "other";

export function FileDrop({ files, setFiles }: { files: Attachment[]; setFiles: (f: Attachment[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const me = useMe();
  const add = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).map((f) => ({
      id: uid("att"), name: f.name, type: fileKind(f), size: `${(f.size / 1048576).toFixed(1)} MB`,
      uploadedAt: iso(new Date()), uploadedBy: me?.name ?? "", url: f.type.startsWith("image") || f.type.startsWith("video") ? URL.createObjectURL(f) : undefined,
    }));
    setFiles([...files, ...next]);
  };
  return (
    <div className="sm:col-span-2">
      <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
        onClick={() => ref.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${over ? "border-info bg-info/5" : "hover:bg-muted"}`}>
        <UploadCloud className="mb-2 size-7 text-info" />
        <p className="text-sm font-medium">Drag & drop files, or click to browse</p>
        <p className="text-xs text-muted-foreground">Images, videos, PDF, Word and other files</p>
        <input ref={ref} type="file" multiple hidden onChange={(e) => add(e.target.files)} />
      </div>
      {files.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-md border p-2">
              {f.type === "image" && f.url ? <img src={f.url} alt="" className="size-10 rounded object-cover" /> :
                <span className="flex size-10 items-center justify-center rounded bg-muted">{f.type === "video" ? <Film className="size-4" /> : f.type === "image" ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}</span>}
              <div className="min-w-0 flex-1"><div className="truncate text-sm">{f.name}</div><div className="text-xs text-muted-foreground">{f.size}</div></div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setFiles(files.filter((x) => x.id !== f.id))}><X className="size-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CaseFormDialog() {
  const { caseDialog, close } = useUI();
  const s = useStore();
  const me = useMe();
  const editing = caseDialog.editId ? s.cases.find((c) => c.id === caseDialog.editId) : undefined;
  const staff = s.users.filter((u) => u.role === "staff");
  const blank = (): Case => ({
    id: uid("case"), number: `LF-2026-${1100 + s.cases.length}`, title: "", description: "", type: CASE_TYPES[0], status: "Pending",
    priority: "Medium", clientId: s.clients[0]?.id ?? "", residentName: "", residentAddress: "", residentPhone: "", notes: "",
    serviceDate: iso(new Date(Date.now() + 3 * 864e5)), serviceTime: "10:00", staffId: staff[0]?.id ?? "", managerId: me?.role === "manager" ? me.id : "u2",
    serviceLocation: "Residence", instructions: "", fee: 150, invoiceStatus: "Not Invoiced", paymentStatus: "Unpaid",
    createdAt: iso(new Date()), updatedAt: iso(new Date()), attachments: [], comments: [], court: "", jurisdiction: "", custom: {},
  });
  const [c, setC] = useState<Case>(blank);
  useEffect(() => { if (caseDialog.open) setC(editing ? { ...editing } : blank()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [caseDialog.open, caseDialog.editId]);
  const set = <K extends keyof Case>(k: K, v: Case[K]) => setC((p) => ({ ...p, [k]: v }));
  const client = s.clients.find((x) => x.id === c.clientId);

  const save = () => {
    if (!c.residentName || !c.clientId) return toast.error("Client and resident name are required");
    const missing = s.customFields.find((f) => f.required && (c.custom[f.id] === undefined || c.custom[f.id] === ""));
    if (missing) return toast.error(`${missing.label} is required`);
    const title = c.title || `${client?.company} v. ${c.residentName}`;
    if (editing) { s.updateCase(c.id, { ...c, title }); toast.success(`Case ${c.number} updated`); }
    else { s.addCase({ ...c, title }); toast.success(`Case ${c.number} created`); }
    close();
  };

  return (
    <Dialog open={caseDialog.open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle className="font-display text-xl">{editing ? `Edit ${editing.number}` : "Create new case"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Section n={1} title="Case Information">
            <F label="Case Number"><Input value={c.number} onChange={(e) => set("number", e.target.value)} /></F>
            <F label="Case Type"><Sel value={c.type} onChange={(v) => set("type", v)} items={CASE_TYPES.map((t) => ({ v: t, l: t }))} /></F>
            <F label="Case Title" span><Input value={c.title} placeholder="Auto-generated if left blank" onChange={(e) => set("title", e.target.value)} /></F>
            <F label="Case Description" span><Textarea rows={2} value={c.description} onChange={(e) => set("description", e.target.value)} /></F>
            <F label="Case Status"><Sel value={c.status} onChange={(v) => set("status", v as Case["status"])} items={STATUSES.map((t) => ({ v: t, l: t }))} /></F>
            <F label="Priority"><Sel value={c.priority} onChange={(v) => set("priority", v as Case["priority"])} items={PRIORITIES.map((t) => ({ v: t, l: t }))} /></F>
          </Section>
          <Section n={2} title="Client Information">
            <F label="Client Name" span><Sel value={c.clientId} onChange={(v) => set("clientId", v)} items={s.clients.map((x) => ({ v: x.id, l: `${x.name} — ${x.company}` }))} /></F>
            <F label="Client Email"><Input value={client?.email ?? ""} readOnly className="bg-muted" /></F>
            <F label="Client Phone"><Input value={client?.phone ?? ""} readOnly className="bg-muted" /></F>
            <F label="Client Address" span><Input value={client?.address ?? ""} readOnly className="bg-muted" /></F>
          </Section>
          <Section n={3} title="Resident Information">
            <F label="Resident Name *"><Input value={c.residentName} onChange={(e) => set("residentName", e.target.value)} /></F>
            <F label="Resident Phone"><Input value={c.residentPhone} onChange={(e) => set("residentPhone", e.target.value)} /></F>
            <F label="Resident Address" span><Input value={c.residentAddress} onChange={(e) => set("residentAddress", e.target.value)} /></F>
            <F label="Additional Notes" span><Textarea rows={2} value={c.notes} onChange={(e) => set("notes", e.target.value)} /></F>
          </Section>
          <Section n={4} title="Service Information">
            <F label="Service Date"><Input type="date" value={c.serviceDate} onChange={(e) => set("serviceDate", e.target.value)} /></F>
            <F label="Service Time"><Input type="time" value={c.serviceTime} onChange={(e) => set("serviceTime", e.target.value)} /></F>
            <F label="Assigned Staff"><Sel value={c.staffId} onChange={(v) => set("staffId", v)} items={staff.map((u) => ({ v: u.id, l: u.name }))} /></F>
            <F label="Service Location"><Input value={c.serviceLocation} onChange={(e) => set("serviceLocation", e.target.value)} /></F>
            <F label="Service Instructions" span><Textarea rows={2} value={c.instructions} onChange={(e) => set("instructions", e.target.value)} /></F>
          </Section>
          <Section n={5} title="Financial Information">
            <F label="Service Fee (USD)"><Input type="number" value={c.fee} onChange={(e) => set("fee", Number(e.target.value))} /></F>
            <F label="Invoice Status"><Sel value={c.invoiceStatus} onChange={(v) => set("invoiceStatus", v as Case["invoiceStatus"])} items={["Not Invoiced", "Draft", "Sent", "Paid", "Overdue"].map((t) => ({ v: t, l: t }))} /></F>
            <F label="Payment Status"><Sel value={c.paymentStatus} onChange={(v) => set("paymentStatus", v as Case["paymentStatus"])} items={["Unpaid", "Partial", "Paid"].map((t) => ({ v: t, l: t }))} /></F>
          </Section>
          {s.customFields.length > 0 && (
            <Section n={6} title="Custom Fields">
              {s.customFields.map((f) => {
                const v = c.custom[f.id];
                const setV = (x: string | number | boolean) => set("custom", { ...c.custom, [f.id]: x });
                const label = f.label + (f.required ? " *" : "");
                if (f.type === "dropdown") return <F key={f.id} label={label}><Sel value={String(v ?? "")} onChange={setV} items={f.options.map((o) => ({ v: o, l: o }))} /></F>;
                if (f.type === "checkbox") return <F key={f.id} label={label}><label className="flex h-9 items-center gap-2 text-sm"><Checkbox checked={!!v} onCheckedChange={(x) => setV(!!x)} /> Yes</label></F>;
                if (f.type === "textarea") return <F key={f.id} label={label} span><Textarea value={String(v ?? "")} onChange={(e) => setV(e.target.value)} /></F>;
                const t = f.type === "phone" ? "tel" : f.type;
                return <F key={f.id} label={label}><Input type={t} value={String(v ?? "")} onChange={(e) => setV(f.type === "number" ? Number(e.target.value) : e.target.value)} /></F>;
              })}
            </Section>
          )}
          <Section n={s.customFields.length ? 7 : 6} title="Attachments">
            <FileDrop files={c.attachments} setFiles={(a) => set("attachments", a)} />
          </Section>
        </div>
        <DialogFooter className="sticky bottom-0 -mx-6 -mb-6 border-t bg-card px-6 py-3">
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={save}>{editing ? "Save changes" : "Create case"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
