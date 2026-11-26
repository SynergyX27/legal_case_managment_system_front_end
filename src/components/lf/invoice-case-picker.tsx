import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Case } from "@/lib/domain";
type Row = Case & { name?: string; company?: string; count?: number; invoiceStatuses?: string[] };
type Result = { rows: Row[]; total: number; page: number; limit: number };
export function InvoiceCasePicker({
  initial = {},
  onChoose,
  onCancel,
}: {
  initial?: {
    clientId?: string;
    workspaceId?: string;
    serviceDate?: string;
    mode?: "single" | "group";
  };
  onChoose: (rows: Case[]) => void;
  onCancel?: () => void;
}) {
  const [mode, setMode] = useState<"single" | "group">(initial.mode || "group");
  const [clientId, setClient] = useState(initial.clientId || ""),
    [workspaceId, setWorkspace] = useState(initial.workspaceId || ""),
    [date, setDate] = useState(initial.serviceDate || "");
  const [stage, setStage] = useState(
    initial.clientId ? (initial.workspaceId ? (initial.serviceDate ? 3 : 2) : 1) : 0,
  );
  const [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [unbilled, setUnbilled] = useState(false),
    [data, setData] = useState<Result>({ rows: [], total: 0, page: 1, limit: 25 });
  const [selected, setSelected] = useState<Row[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ack, setAck] = useState(false);
  const kinds = ["customers", "communities", "dates", "cases"];
  const query = (limit = 25, p = page) =>
    new URLSearchParams({
      kind: kinds[stage],
      q,
      clientId: stage > 0 ? clientId : "",
      workspaceId: stage > 1 ? workspaceId : "",
      serviceDate: stage > 2 ? date : "",
      mode,
      unbilled: String(unbilled),
      page: String(p),
      limit: String(limit),
    }).toString();
  const current = useRef("");
  current.current = query();
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    setData({ rows: [], total: 0, page, limit: 25 });
    const timer = setTimeout(() => {
      api<Result>(`/invoice-picker?${query()}`)
        .then((r) => {
          if (active) setData(r);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [stage, q, page, clientId, workspaceId, date, mode, unbilled]);
  const reset = () => {
    setQ("");
    setPage(1);
    setSelected([]);
    setAck(false);
  };
  const next = (r: Row) => {
    if (stage === 0) setClient(r.id);
    if (stage === 1) setWorkspace(r.id);
    if (stage === 2) setDate(r.id);
    reset();
    setStage(stage + 1);
  };
  const pick = (r: Row) => {
    setError("");
    setAck(false);
    setSelected((p) =>
      p.some((x) => x.id === r.id)
        ? p.filter((x) => x.id !== r.id)
        : mode === "single"
          ? [r]
          : p.length < 100
            ? [...p, r]
            : p,
    );
  };
  const warnings = selected.filter((r) => r.invoiceStatuses?.length);
  async function all() {
    const key = current.current;
    setBusy(true);
    setError("");
    try {
      const r = await api<Result>(`/invoice-picker?${query(100, 1)}`);
      if (current.current !== key) return;
      if (r.total > 100)
        throw new Error("More than 100 cases match. Narrow the search before selecting all.");
      setSelected(r.rows);
      setAck(false);
    } catch (e) {
      if (current.current === key) setError((e as Error).message);
    } finally {
      if (current.current === key) setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === "group" ? "default" : "outline"}
            onClick={() => {
              setMode("group");
              setStage(0);
              reset();
            }}
          >
            Group apartments
          </Button>
          <Button
            size="sm"
            variant={mode === "single" ? "default" : "outline"}
            onClick={() => {
              setMode("single");
              setStage(0);
              reset();
            }}
          >
            Single case
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Customer → Community → Service date → Cases. Grouped invoices require the same customer,
          community and date.
        </p>
        <div className="flex justify-between items-center">
          <strong>
            {
              [
                "1. Select customer",
                "2. Select community",
                "3. Select service date",
                "4. Select cases",
              ][stage]
            }
          </strong>
          {stage > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStage(stage - 1);
                reset();
              }}
            >
              Back
            </Button>
          )}
        </div>
        <Input
          aria-label="Search invoice cases or filters"
          placeholder={
            stage === 3
              ? "Search case number, REF ID, tenant, address or unit…"
              : stage === 2
                ? "Search service date (YYYY-MM-DD)…"
                : `Search ${stage === 0 ? "customers" : "communities"}…`
          }
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        {stage === 3 && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={unbilled}
              onChange={(e) => {
                setUnbilled(e.target.checked);
                setPage(1);
              }}
            />
            Hide cases already included in invoices
          </label>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="text-sm text-muted-foreground">
          Searching…
        </p>
      )}
      {!busy && stage < 3 && (
        <div className="space-y-2">
          {mode === "single" && stage === 1 && (
            <Button variant="outline" onClick={() => next({ id: "" } as Row)}>
              All communities / unassigned cases
            </Button>
          )}
          {mode === "single" && stage === 2 && (
            <Button variant="outline" onClick={() => next({ id: "" } as Row)}>
              All service dates
            </Button>
          )}
          {data.rows.map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => next(r)}
              className="block w-full rounded-xl border p-3 text-left text-sm hover:bg-accent"
            >
              <span className="font-medium">{r.company || r.name || r.id}</span>
              {stage === 2 && <span className="ml-2 text-muted-foreground">{r.count} cases</span>}
            </button>
          ))}
        </div>
      )}
      {stage === 3 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>
              {selected.length} cases selected{" "}
              <span className="text-xs font-normal text-muted-foreground">
                / {mode === "group" ? 100 : 1}
              </span>
            </strong>
            <div className="flex gap-2">
              {mode === "group" && (
                <Button size="sm" variant="outline" disabled={busy || !data.total} onClick={all}>
                  Select all matching
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={!selected.length}
                onClick={() => {
                  setSelected([]);
                  setAck(false);
                }}
              >
                Clear selection
              </Button>
            </div>
          </div>
          <div className="max-h-80 overflow-auto rounded-xl border">
            <table className="w-full min-w-[600px] text-sm text-left">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  {["Select", "Case / REF ID", "Tenant / Unit", "Status / Billing"].map((x) => (
                    <th key={x} className="p-3 font-medium">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-accent/30">
                    <td className="p-3">
                      <input
                        aria-label={`Select ${r.number}`}
                        type="checkbox"
                        checked={selected.some((x) => x.id === r.id)}
                        disabled={
                          busy ||
                          (mode === "group" &&
                            selected.length >= 100 &&
                            !selected.some((x) => x.id === r.id))
                        }
                        onChange={() => pick(r)}
                      />
                    </td>
                    <td className="p-3">
                      {r.number}
                      <p className="text-xs text-muted-foreground">{r.refId || "—"}</p>
                    </td>
                    <td className="p-3">
                      {r.residentName}
                      <p className="text-xs text-muted-foreground">
                        Unit {r.unit || "—"} · {r.residentAddress}
                      </p>
                    </td>
                    <td className="p-3">
                      {r.status}
                      <p
                        className={
                          r.invoiceStatuses?.length
                            ? "text-amber-600 text-xs"
                            : "text-muted-foreground text-xs"
                        }
                      >
                        {r.invoiceStatuses?.length
                          ? `Already invoiced: ${r.invoiceStatuses.join(", ")}`
                          : "Not invoiced"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!!warnings.length && (
            <label className="flex gap-2 rounded-xl border border-amber-400/40 bg-amber-500/5 p-3 text-sm">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              {warnings.length} selected cases already have invoices. I checked the existing
              invoices and these are new charges.
            </label>
          )}
        </>
      )}
      {!busy && !error && !data.total && (
        <p className="text-sm text-muted-foreground">
          No matching {kinds[stage]}. Try another filter. Group mode only shows assigned APT cases
          with a service date.
        </p>
      )}
      <div className="flex items-center justify-between gap-2 text-sm">
        <Button
          variant="outline"
          size="sm"
          disabled={busy || page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </Button>
        <span>
          {data.total} results · Page {page} of {Math.max(1, Math.ceil(data.total / 25))}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={busy || page * 25 >= data.total}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel selection
          </Button>
        )}
        {stage === 3 && (
          <Button
            disabled={busy || !selected.length || !!error || (!!warnings.length && !ack)}
            onClick={() => onChoose(selected)}
          >
            Continue with {selected.length} case{selected.length === 1 ? "" : "s"}
          </Button>
        )}
      </div>
    </div>
  );
}
