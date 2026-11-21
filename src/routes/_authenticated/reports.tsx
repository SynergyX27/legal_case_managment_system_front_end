import { useState } from "react";
import {
  CaseMoney,
  CaseStatusTiles,
  PortfolioFilters,
  CaseReportActions,
} from "@/components/lf/case-portfolio";
import { defaultViews, type SavedView } from "@/lib/store";
import { filterCases } from "@/lib/case-management";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, CheckCheck, Clock3, Download, FolderOpen, Receipt } from "lucide-react";
import { PageHeader, Avatar, StatusBadge } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { canAccess, useMe, useStore, useVisibleCases, money } from "@/lib/store";
import { buildReports, reportCsv } from "@/lib/reports";
export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports – LegalFlow" }] }),
  component: Page,
});
function Page() {
  const s = useStore(),
    me = useMe(),
    allCases = useVisibleCases();
  const [filters, setFilters] = useState<SavedView["filters"]>(() => defaultViews()[0].filters);
  const cases = filterCases(allCases, filters, s.clients, s.users, me?.id);
  const report = buildReports(cases, s.invoices, s.users, s.clients);
  const tones: Record<string, string> = {
    Active: "#285ba7",
    Pending: "#e2b86c",
    Scheduled: "#7a9cc2",
    Completed: "#abd7c1",
    Cancelled: "#d7e0dc",
  };
  const exportReport = () => {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + reportCsv(report)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "legalflow-reports.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  if (!canAccess(me, "reports"))
    return (
      <PageHeader title="Reports unavailable" subtitle="Sign in to view reports for your cases." />
    );
  return (
    <>
      <PageHeader
        title="Case reports"
        subtitle="Filter case files and balances by community, plaintiff or location."
        actions={
          <>
            <CaseReportActions
              cases={cases}
              filters={filters}
              title={
                Object.entries(filters)
                  .filter(([, v]) => (Array.isArray(v) ? v.length : !!v))
                  .map(([k, v]) => k + " = " + String(v))
                  .join(" · ") || "All accessible cases"
              }
            />
            <Button variant="outline" onClick={exportReport}>
              <Download />
              Export report
            </Button>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <label className="grid gap-1 text-xs">
          Saved case view
          <select
            className="h-9 rounded-lg border bg-background px-3"
            defaultValue=""
            onChange={(e) => {
              const view = s.savedViews.find((v) => v.id === e.target.value);
              if (view) setFilters({ ...view.filters });
            }}
          >
            <option value="">Choose a saved view</option>
            {s.savedViews.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <PortfolioFilters
          cases={allCases}
          filters={filters}
          onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        />
        <Button variant="ghost" onClick={() => setFilters(defaultViews()[0].filters)}>
          Clear filters
        </Button>
      </div>
      <CaseStatusTiles
        cases={cases}
        onSelect={(status) =>
          setFilters((f) => ({ ...f, status: status === "All cases" ? [] : [status] }))
        }
      />
      <CaseMoney cases={cases} />
      <section className="overview-card mb-6 overflow-auto">
        <h2>Matching case files</h2>
        <table className="mt-4 w-full min-w-[700px] text-left text-xs">
          <thead>
            <tr>
              {[
                "Case number",
                "Community",
                "Plaintiff",
                "Tenant",
                "County",
                "City",
                "State",
                "Status",
                "Money owed",
              ].map((h) => (
                <th key={h} className="p-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-t">
                {[
                  c.number,
                  c.community,
                  c.plaintiff,
                  c.residentName,
                  c.county,
                  c.city,
                  c.state,
                  c.status,
                  money(c.moneyOwed || 0),
                ].map((v, i) => (
                  <td key={i} className="p-2">
                    {v || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!cases.length && (
          <p className="mt-4 text-sm text-muted-foreground">No cases match these filters.</p>
        )}
      </section>
      <div className="mb-6 rounded-xl border bg-card px-4 py-3 text-xs text-muted-foreground">
        All-time snapshot · {report.total} visible cases · {new Date().toLocaleDateString()} ·
        Changes to cases and invoices update these reports automatically.
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: "Total cases",
            value: report.total,
            detail: `${report.open} currently open`,
            Icon: FolderOpen,
          },
          {
            label: "Completed",
            value: report.completed,
            detail: `${report.completionRate}% of all visible cases`,
            Icon: CheckCheck,
          },
          {
            label: "Recorded payments",
            value: money(report.paid),
            detail: "Invoices marked as paid",
            Icon: Receipt,
          },
          {
            label: "Outstanding",
            value: money(report.outstanding),
            detail: `${money(report.overdue)} marked overdue`,
            Icon: Clock3,
          },
        ].map(({ label, value, detail, Icon }) => (
          <section key={label} className="metric-card">
            <div className="flex items-center justify-between">
              <p className="metric-label">{label}</p>
              <Icon className="size-4 text-primary" />
            </div>
            <p className="metric-value break-words">{value}</p>
            <p className="metric-footer">{detail}</p>
          </section>
        ))}
      </div>
      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <section className="overview-card">
          <h2>Case status report</h2>
          <p className="mb-6 mt-2 text-xs text-muted-foreground">
            Where your case files stand today
          </p>
          <div className="space-y-5">
            {report.statuses.map((x) => (
              <div key={x.status}>
                <div className="mb-2 flex justify-between text-xs">
                  <span>{x.status}</span>
                  <span className="font-semibold">
                    {x.count}{" "}
                    <span className="ml-2 font-normal text-muted-foreground">
                      ({report.total ? Math.round((x.count / report.total) * 100) : 0}%)
                    </span>
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${x.status} cases`}
                  aria-valuenow={x.count}
                  aria-valuemin={0}
                  aria-valuemax={Math.max(1, report.total)}
                  className="h-2 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: tones[x.status] || "#7a9cc2",
                      width: `${report.total ? (x.count / report.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="overview-card">
          <h2>Invoice report</h2>
          <p className="mb-6 mt-2 text-xs text-muted-foreground">
            Totals include tax; drafts are excluded from outstanding amounts.
          </p>
          <div className="divide-y">
            {report.billing.map((x) => (
              <div key={x.status} className="flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                  <StatusBadge value={x.status} />
                  <span className="text-xs text-muted-foreground">
                    {x.count} invoice{x.count === 1 ? "" : "s"}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums">{money(x.amount)}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
            Payment and overdue statuses are manually recorded in this workspace. These figures
            describe service invoices, not tenant rent arrears.
          </p>
        </section>
      </div>
      <section className="overview-card mb-6 !p-0">
        <div className="p-6">
          <h2>Staff workload</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Assigned case totals, open work and completed services
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left">
            <thead>
              <tr>
                {["Staff member", "Assigned cases", "Open", "Completed"].map((h) => (
                  <th key={h} className="px-6">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {report.staff.map((u) => (
                <tr key={u.id}>
                  <td className="px-6">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} />
                      {u.name}
                    </div>
                  </td>
                  <td className="px-6">{u.total}</td>
                  <td className="px-6">{u.open}</td>
                  <td className="px-6">{u.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!report.staff.length && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No assigned cases in this workspace.
            </p>
          )}
        </div>
      </section>
      <section className="overview-card !p-0">
        <div className="p-6">
          <h2>Customer summary</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Case volume and invoice balances for each customer
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left">
            <thead>
              <tr>
                {["Customer", "Cases", "Completed", "Recorded payments", "Outstanding"].map((h) => (
                  <th key={h} className="px-6">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {report.clients.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 font-semibold">{c.name}</td>
                  <td className="px-6">{c.total}</td>
                  <td className="px-6">{c.completed}</td>
                  <td className="px-6">{money(c.paid)}</td>
                  <td className="px-6">{money(c.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!report.clients.length && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No customer cases to report yet.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
