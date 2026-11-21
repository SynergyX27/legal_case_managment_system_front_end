import { useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { STATUSES, type Case } from "@/lib/domain";
import { useStore, useMe, uid } from "@/lib/store";
import { can } from "@/lib/access";
type PreviewRow = { rowNumber: number; case?: Case; error?: string };
export function CaseImportDialog() {
  const s = useStore(),
    me = useMe();
  const [open, setOpen] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [rows, setRows] = useState<PreviewRow[]>([]),
    [busy, setBusy] = useState(false),
    [batchId, setBatchId] = useState(""),
    [defaults, setDefaults] = useState({
      clientId: "",
      staffId: "",
      status: "Pending",
      custom: {} as Record<string, string | number | boolean>,
    });
  if (!can(me, "cases.create")) return null;
  const staff = s.users.filter(
    (u) =>
      u.role === "staff" &&
      u.status === "Active" &&
      (me?.role === "owner" || (me?.role === "manager" ? u.managerId === me.id : u.id === me?.id)),
  );
  const select = (
    key: "clientId" | "staffId" | "status",
    label: string,
    options: { id: string; name: string }[],
  ) => (
    <label className="grid gap-1 text-sm">
      {label}
      <select
        disabled={busy}
        className="h-10 rounded-lg border bg-background px-3"
        value={defaults[key]}
        onChange={(e) => {
          setDefaults({ ...defaults, [key]: e.target.value });
          setRows([]);
        }}
      >
        <option value="">Use spreadsheet value</option>
        {options.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>
    </label>
  );
  const template = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          "Case Number,Tenant,Customer,Assigned Staff,Plaintiff,Apartment Community,Neighborhood,Address,County,City,State,Zip,Money Owed,Status,Setout Date,Setout Time\r\n",
        ],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "legalflow-case-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setOpen(true);
          setRows([]);
          setFile(null);
          setBatchId(uid("import"));
        }}
      >
        <Upload />
        Import cases
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) setOpen(next);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Import case files</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Upload CSV or XLSX with a header row and up to 1,000 cases. Case Number and Tenant are
            required columns. Use YYYY-MM-DD dates and HH:mm times. Customer and staff values can be
            IDs, usernames or unique names. The manager follows the staff member’s team.
          </p>
          <Button variant="outline" onClick={template}>
            Download CSV template
          </Button>
          <Input
            aria-label="Case import file"
            type="file"
            accept=".csv,.xlsx"
            disabled={busy}
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setRows([]);
            }}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {select(
              "clientId",
              "Default customer",
              s.clients.map((c) => ({ id: c.id, name: c.company || c.name })),
            )}
            {select("staffId", "Default staff", staff)}
            {select(
              "status",
              "Default status",
              STATUSES.map((v) => ({ id: v, name: v })),
            )}
          </div>
          {s.customFields
            .filter((f) => f.required)
            .map((f) => (
              <label key={f.id} className="text-sm">
                {f.label} (all imported cases)
                {f.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={!!defaults.custom[f.id]}
                    onChange={(e) => {
                      setDefaults({
                        ...defaults,
                        custom: { ...defaults.custom, [f.id]: e.target.checked },
                      });
                      setRows([]);
                    }}
                  />
                ) : (
                  <Input
                    disabled={busy}
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    value={String(defaults.custom[f.id] ?? "")}
                    onChange={(e) => {
                      setDefaults({
                        ...defaults,
                        custom: {
                          ...defaults.custom,
                          [f.id]: f.type === "number" ? Number(e.target.value) : e.target.value,
                        },
                      });
                      setRows([]);
                    }}
                  />
                )}
              </label>
            ))}
          <Button
            disabled={!file || busy}
            onClick={async () => {
              if (!file) return;
              if (file.size > 10 * 1024 * 1024) return toast.error("Use a file smaller than 10 MB");
              setBusy(true);
              setRows([]);
              try {
                const body = new FormData();
                body.append("file", file);
                body.append("defaults", JSON.stringify(defaults));
                const result = await api<{ results: PreviewRow[] }>("/cases/import/preview", {
                  method: "POST",
                  body,
                });
                setRows(result.results);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Please wait…" : "Preview import"}
          </Button>
          {!!rows.length && (
            <>
              <p className="text-sm">
                {rows.filter((r) => r.case).length} ready · {rows.filter((r) => r.error).length}{" "}
                errors. Correct errors in the spreadsheet and preview again before importing.
              </p>
              <div className="max-h-64 overflow-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr>
                      <th className="p-2">Row</th>
                      <th>Case</th>
                      <th>Customer / staff</th>
                      <th>Money owed</th>
                      <th>Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.rowNumber} className="border-t">
                        <td className="p-2">{r.rowNumber}</td>
                        <td>{r.case?.number}</td>
                        <td>
                          {s.clients.find((c) => c.id === r.case?.clientId)?.name} /{" "}
                          {s.users.find((u) => u.id === r.case?.staffId)?.name}
                        </td>
                        <td>{r.case?.moneyOwed?.toFixed(2)}</td>
                        <td className={r.error ? "text-destructive" : "text-primary"}>
                          {r.error || "Ready"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                disabled={busy || rows.some((r) => r.error)}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const result = await api<{ count: number }>("/cases/import/commit", {
                      method: "POST",
                      body: { batchId, cases: rows.map((r) => r.case) },
                    });
                    await s.refresh();
                    toast.success(`${result.count} cases imported`);
                    setOpen(false);
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Import {rows.length} cases
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
