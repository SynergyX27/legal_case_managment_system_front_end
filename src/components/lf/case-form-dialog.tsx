import {
  useEffect,
  useRef,
  useState,
  useId,
  Children,
  isValidElement,
  cloneElement,
  type ReactNode,
  type ReactElement,
} from "react";
import { toast } from "sonner";
import { UploadCloud, X, FileText, Film, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMe, useStore, uid } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { CASE_TYPES, PRIORITIES, STATUSES, iso, type Attachment, type Case } from "@/lib/domain";
import { fileKind } from "@/lib/documents";

function F({ label, children, span }: { label: string; children: ReactNode; span?: boolean }) {
  const id = useId();
  return (
    <div className={span ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {Children.map(children, (child) =>
        isValidElement(child)
          ? cloneElement(child as ReactElement<any>, { id, "aria-label": label })
          : child,
      )}
    </div>
  );
}
function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-lg border p-4">
      <legend className="px-1 text-sm font-semibold">
        <span className="mr-2 text-info">0{n}</span>
        {title}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
function Sel({
  value,
  onChange,
  items,
  id,
  "aria-label": ariaLabel,
}: {
  id?: string;
  "aria-label"?: string;
  value: string;
  onChange: (v: string) => void;
  items: { v: string; l: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={ariaLabel} className="w-full">
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.v} value={i.v}>
            {i.l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FileDrop({
  files,
  setFiles,
}: {
  files: Attachment[];
  setFiles: (f: Attachment[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const me = useMe();
  const [reading, setReading] = useState(false);
  const storedCases = useStore((s) => s.cases);
  const companyDocuments = useStore((s) => s.companyDocuments);
  const add = async (list: FileList | null) => {
    if (!list || reading) return;
    if (Array.from(list).some((f) => f.size > 25 * 1024 * 1024))
      return toast.error("Choose files up to 25 MB each");
    setReading(true);
    try {
      const next = await Promise.all(
        Array.from(list).map(async (f) => ({
          id: crypto.randomUUID(),
          name: f.name,
          type: fileKind(f),
          size:
            f.size < 1048576
              ? `${Math.max(1, Math.round(f.size / 1024))} KB`
              : `${(f.size / 1048576).toFixed(1)} MB`,
          uploadedAt: iso(new Date()),
          uploadedBy: me?.name ?? "",
          pendingFile: f,
        })),
      );
      setFiles([...files, ...next]);
    } catch {
      toast.error("Could not read the selected files. Please try again.");
    } finally {
      setReading(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <div className="sm:col-span-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        onClick={() => ref.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Choose files"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            ref.current?.click();
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${over ? "border-info bg-info/5" : "hover:bg-muted"}`}
      >
        <UploadCloud className="mb-2 size-7 text-info" />
        <p className="text-sm font-medium">
          {reading ? "Reading files…" : "Choose files or drop them here"}
        </p>
        <p className="text-xs text-muted-foreground">Local uploads · 2 MB total</p>
        <input ref={ref} type="file" multiple hidden onChange={(e) => add(e.target.files)} />
      </div>
      {files.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-md border p-2">
              {f.type === "image" &&
              f.url?.startsWith("data:image/") &&
              !f.url.startsWith("data:image/svg") ? (
                <img src={f.url} alt="" className="size-10 rounded object-cover" />
              ) : (
                <span className="flex size-10 items-center justify-center rounded bg-muted">
                  {f.type === "video" ? (
                    <Film className="size-4" />
                  ) : f.type === "image" ? (
                    <ImageIcon className="size-4" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{f.name}</div>
                <div className="text-xs text-muted-foreground">{f.size}</div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFiles(files.filter((x) => x.id !== f.id))}
              >
                <X className="size-4" />
              </Button>
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
  const staff = s.users.filter((u) => u.role === "staff" && u.status === "Active");
  const blank = (): Case => ({
    id: uid("case"),
    number: "",
    title: "",
    description: "",
    type: CASE_TYPES[0],
    status: "Pending",
    priority: "Medium",
    clientId: s.clients[0]?.id ?? "",
    residentName: "",
    residentAddress: "",
    residentPhone: "",
    notes: "",
    serviceDate: iso(new Date(Date.now() + 3 * 864e5)),
    serviceTime: "10:00",
    staffId: staff[0]?.id ?? "",
    managerId: me?.role === "manager" ? me.id : "",
    serviceLocation: "Residence",
    instructions: "",
    fee: 0,
    invoiceStatus: "Not Invoiced",
    paymentStatus: "Unpaid",
    createdAt: iso(new Date()),
    updatedAt: iso(new Date()),
    attachments: [],
    comments: [],
    court: "",
    jurisdiction: "",
    custom: {},
    ref: "",
    plaintiff: "",
    county: "",
    city: "",
    state: "",
    zip: "",
    visLO: "",
    visTO: "",
    locs: "",
    lbx: "",
  });
  const [c, setC] = useState<Case>(blank);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (caseDialog.open)
      setC(
        editing ? { ...editing } : blank(),
      ); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [caseDialog.open, caseDialog.editId]);
  const set = <K extends keyof Case>(k: K, v: Case[K]) => setC((p) => ({ ...p, [k]: v }));
  const client = s.clients.find((x) => x.id === c.clientId);

  const save = async () => {
    if (saving || me?.role === "customer") return;
    if (!c.number.trim() || !c.residentName.trim() || !c.clientId)
      return toast.error("Case number, customer and tenant are required");
    if (
      s.cases.some((x) => x.id !== c.id && x.number.toLowerCase() === c.number.trim().toLowerCase())
    )
      return toast.error("Case number already exists");
    const missing = s.customFields.find(
      (f) => f.required && (c.custom[f.id] === undefined || c.custom[f.id] === ""),
    );
    if (missing) return toast.error(`${missing.label} is required`);
    const title = c.title || `${client?.company} v. ${c.residentName}`;
    setSaving(true);
    try {
      if (editing) {
        if (!(await s.updateCase(c.id, { ...c, title }))) return;
        toast.success(`Case ${c.number} updated`);
      } else {
        if (!(await s.addCase({ ...c, title }))) return;
        toast.success(`Case ${c.number} created`);
      }
      close();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={caseDialog.open && me?.role !== "customer"}
      onOpenChange={(o) => !o && !saving && close()}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {editing ? `Edit ${editing.number}` : "Create new case"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Section n={1} title="Case Information">
            <F label="REF">
              <Input
                aria-label="REF"
                value={c.ref ?? ""}
                onChange={(e) => set("ref", e.target.value)}
              />
            </F>
            <F label="Plaintiff">
              <Input
                aria-label="Plaintiff"
                value={c.plaintiff ?? ""}
                onChange={(e) => set("plaintiff", e.target.value)}
              />
            </F>
            <F label="Case Number">
              <Input value={c.number} onChange={(e) => set("number", e.target.value)} />
            </F>
            <F label="Case Type">
              <Sel
                value={c.type}
                onChange={(v) => set("type", v)}
                items={CASE_TYPES.map((t) => ({ v: t, l: t }))}
              />
            </F>
            <F label="Case Title" span>
              <Input
                value={c.title}
                placeholder="Auto-generated if left blank"
                onChange={(e) => set("title", e.target.value)}
              />
            </F>
            <F label="Case Description" span>
              <Textarea
                rows={2}
                value={c.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </F>
            <F label="Case Status">
              <Sel
                value={c.status}
                onChange={(v) => set("status", v as Case["status"])}
                items={STATUSES.map((t) => ({ v: t, l: t }))}
              />
            </F>
            <F label="Priority">
              <Sel
                value={c.priority}
                onChange={(v) => set("priority", v as Case["priority"])}
                items={PRIORITIES.map((t) => ({ v: t, l: t }))}
              />
            </F>
          </Section>
          <Section n={2} title="Client Information">
            <F label="Assigned Customer" span>
              <Sel
                value={c.clientId}
                onChange={(v) => set("clientId", v)}
                items={s.clients.map((x) => ({
                  v: x.id,
                  l: x.company && x.company !== x.name ? `${x.name} — ${x.company}` : x.name,
                }))}
              />
            </F>
            <F label="Client Email">
              <Input value={client?.email ?? ""} readOnly className="bg-muted" />
            </F>
            <F label="Client Phone">
              <Input value={client?.phone ?? ""} readOnly className="bg-muted" />
            </F>
            <F label="Client Address" span>
              <Input value={client?.address ?? ""} readOnly className="bg-muted" />
            </F>
          </Section>
          <Section n={3} title="Tenant & Property">
            <F label="Tenant *">
              <Input value={c.residentName} onChange={(e) => set("residentName", e.target.value)} />
            </F>
            <F label="Resident Phone">
              <Input
                value={c.residentPhone}
                onChange={(e) => set("residentPhone", e.target.value)}
              />
            </F>
            <F label="Address" span>
              <Input
                value={c.residentAddress}
                onChange={(e) => set("residentAddress", e.target.value)}
              />
            </F>
            {(
              [
                ["county", "County"],
                ["city", "City"],
                ["state", "State"],
                ["zip", "Zip"],
              ] as const
            ).map(([key, label]) => (
              <F key={key} label={label}>
                <Input
                  aria-label={label}
                  value={c[key] ?? ""}
                  onChange={(e) => set(key, e.target.value)}
                />
              </F>
            ))}
            <F label="Additional Notes" span>
              <Textarea rows={2} value={c.notes} onChange={(e) => set("notes", e.target.value)} />
            </F>
          </Section>
          <Section n={4} title="Service Information">
            <F label="Setout Date">
              <Input
                type="date"
                value={c.serviceDate}
                onChange={(e) => set("serviceDate", e.target.value)}
              />
            </F>
            <F label="Setout Time">
              <Input
                type="time"
                value={c.serviceTime}
                onChange={(e) => set("serviceTime", e.target.value)}
              />
            </F>
            <F label="Assigned Staff">
              <Sel
                value={c.staffId}
                onChange={(v) => set("staffId", v)}
                items={staff.map((u) => ({ v: u.id, l: u.name }))}
              />
            </F>
            <F label="Assigned Manager">
              <Sel
                value={c.managerId}
                onChange={(v) => set("managerId", v)}
                items={s.users
                  .filter(
                    (u) => (u.role === "manager" || u.role === "owner") && u.status === "Active",
                  )
                  .map((u) => ({ v: u.id, l: u.name }))}
              />
            </F>
            <F label="Service Location">
              <Input
                value={c.serviceLocation}
                onChange={(e) => set("serviceLocation", e.target.value)}
              />
            </F>
            <F label="Service Instructions" span>
              <Textarea
                rows={2}
                value={c.instructions}
                onChange={(e) => set("instructions", e.target.value)}
              />
            </F>
          </Section>
          <Section n={5} title="Property & Visit Details">
            {(
              [
                ["visLO", "VIS - LO"],
                ["visTO", "VIS - TO"],
                ["locs", "LOCS"],
                ["lbx", "LBX"],
              ] as const
            ).map(([key, label]) => (
              <F key={key} label={label}>
                <Input
                  aria-label={label}
                  value={c[key] ?? ""}
                  onChange={(e) => set(key, e.target.value)}
                />
              </F>
            ))}
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Client-defined tracking fields. Invoice amounts and payments are managed separately in
              Invoices.
            </p>
          </Section>
          {s.customFields.length > 0 && (
            <Section n={6} title="Custom Fields">
              {s.customFields.map((f) => {
                const v = c.custom[f.id];
                const setV = (x: string | number | boolean) =>
                  set("custom", { ...c.custom, [f.id]: x });
                const label = f.label + (f.required ? " *" : "");
                if (f.type === "dropdown")
                  return (
                    <F key={f.id} label={label}>
                      <Sel
                        value={String(v ?? "")}
                        onChange={setV}
                        items={f.options.map((o) => ({ v: o, l: o }))}
                      />
                    </F>
                  );
                if (f.type === "checkbox")
                  return (
                    <F key={f.id} label={label}>
                      <label className="flex h-9 items-center gap-2 text-sm">
                        <Checkbox checked={!!v} onCheckedChange={(x) => setV(!!x)} /> Yes
                      </label>
                    </F>
                  );
                if (f.type === "textarea")
                  return (
                    <F key={f.id} label={label} span>
                      <Textarea value={String(v ?? "")} onChange={(e) => setV(e.target.value)} />
                    </F>
                  );
                const t = f.type === "phone" ? "tel" : f.type;
                return (
                  <F key={f.id} label={label}>
                    <Input
                      type={t}
                      value={String(v ?? "")}
                      onChange={(e) =>
                        setV(f.type === "number" ? Number(e.target.value) : e.target.value)
                      }
                    />
                  </F>
                );
              })}
            </Section>
          )}
          <Section n={s.customFields.length ? 7 : 6} title="Attachments">
            <FileDrop files={c.attachments} setFiles={(a) => set("attachments", a)} />
          </Section>
        </div>
        <DialogFooter className="sticky bottom-0 -mx-6 -mb-6 border-t bg-card px-6 py-3">
          <Button disabled={saving} variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={save}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
