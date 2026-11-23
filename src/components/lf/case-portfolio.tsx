import { ModernSelect } from "@/components/ui/modern-select";
import { useState } from "react";
import { toast } from "sonner";
import { Printer, Mail, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STATUSES, type Case } from "@/lib/domain";
import { useStore, useMe, money, type SavedView } from "@/lib/store";
import { api } from "@/lib/api";
import {
  caseMoney,
  defaultStatusTiles,
  portfolioKeys,
  portfolioLabels,
  printCaseReport,
} from "@/lib/case-portfolio";

export function PortfolioFilters({
  cases,
  filters,
  onChange,
}: {
  cases: Case[];
  filters: SavedView["filters"];
  onChange: (patch: Partial<SavedView["filters"]>) => void;
}) {
  return (
    <>
      {portfolioKeys.map((key) => (
        <label key={key} className="grid gap-1 text-xs text-muted-foreground">
          {portfolioLabels[key]}
          <ModernSelect
            className="h-9 min-w-36 rounded-lg border bg-background px-3 text-foreground"
            value={filters[key] || ""}
            onChange={(e) => onChange({ [key]: e.target.value })}
          >
            <option value="">All</option>
            {[...new Set(cases.map((c) => c[key]?.trim()).filter(Boolean))].sort().map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </ModernSelect>
        </label>
      ))}
    </>
  );
}
export function CaseMoney({ cases }: { cases: Case[] }) {
  const totals = caseMoney(cases);
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      {[
        { label: "Amount owed", value: totals.owed, color: "#dc4444" },
        { label: "Amount cleared", value: totals.cleared, color: "#16986b" },
        { label: "Amount due", value: totals.due, color: "#d9a022" },
      ].map((x) => (
        <section key={x.label} className="metric-card">
          <p className="metric-label">{x.label}</p>
          <p className="metric-value" style={{ color: x.color }}>
            {money(x.value)}
          </p>
          <div
            role="meter"
            aria-label={x.label}
            aria-valuenow={x.value}
            aria-valuemin={0}
            aria-valuemax={Math.max(1, totals.owed)}
            className="mt-3 h-1.5 overflow-hidden rounded bg-muted"
          >
            <div
              style={{
                backgroundColor: x.color,
                height: "100%",
                width: `${totals.owed ? (x.value / totals.owed) * 100 : 0}%`,
              }}
            />
          </div>
        </section>
      ))}
    </div>
  );
}
export function CaseStatusTiles({
  cases,
  onSelect,
}: {
  cases: Case[];
  onSelect?: (status: string) => void;
}) {
  const s = useStore();
  const selected = s.tablePrefs?.statusTiles ?? defaultStatusTiles;
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState<string[]>([]),
    [saving, setSaving] = useState(false);
  const all = ["All cases", ...STATUSES];
  return (
    <>
      <div className="mb-2 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraft([...selected]);
            setOpen(true);
          }}
        >
          <Settings2 />
          Edit status tiles
        </Button>
      </div>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!saving) setOpen(next);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Visible status tiles</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Button disabled={saving} variant="outline" onClick={() => setDraft(all)}>
              Select all
            </Button>
            <Button disabled={saving} variant="ghost" onClick={() => setDraft([])}>
              Clear selection
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {all.map((status) => (
              <label key={status} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={saving}
                  checked={draft.includes(status)}
                  onChange={(e) =>
                    setDraft((current) =>
                      e.target.checked ? [...current, status] : current.filter((v) => v !== status),
                    )
                  }
                />
                {status}
              </label>
            ))}
          </div>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                const saved = await s.setTablePrefs({
                  visible: [],
                  order: [],
                  widths: {},
                  pageSize: 10,
                  ...s.tablePrefs,
                  statusTiles: draft,
                });
                if (saved) setOpen(false);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving…" : "Save tile preferences"}
          </Button>
        </DialogContent>
      </Dialog>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {selected.map((status) => {
          const content = (
            <>
              <p className="metric-label">{status}</p>
              <p className="metric-value">
                {status === "All cases"
                  ? cases.length
                  : cases.filter((c) => c.status === status).length}
              </p>
            </>
          );
          return onSelect ? (
            <button
              type="button"
              key={status}
              onClick={() => onSelect(status)}
              className="metric-card text-left hover:border-primary/50"
            >
              {content}
            </button>
          ) : (
            <section key={status} className="metric-card">
              {content}
            </section>
          );
        })}
      </div>
    </>
  );
}
export function CaseReportActions({
  cases,
  filters,
  title,
}: {
  cases: Case[];
  filters: SavedView["filters"];
  title: string;
}) {
  const s = useStore(),
    me = useMe();
  const [emailOpen, setEmailOpen] = useState(false),
    [to, setTo] = useState(""),
    [busy, setBusy] = useState(false);
  const statuses = s.tablePrefs?.statusTiles ?? defaultStatusTiles;
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          try {
            printCaseReport(cases, title, statuses);
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      >
        <Printer />
        Print / PDF
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          setTo(me?.email || "");
          setEmailOpen(true);
        }}
      >
        <Mail />
        Email report
      </Button>
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email case report</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Send the current report, including matching case details and balances.
          </p>
          <label className="text-sm">
            Recipient email
            <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <Button
            disabled={busy || !to.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await api("/reports/cases/email", {
                  method: "POST",
                  body: { to, filters, statuses },
                });
                toast.success("Report queued for email delivery");
                setEmailOpen(false);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Sending…" : "Send report"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
