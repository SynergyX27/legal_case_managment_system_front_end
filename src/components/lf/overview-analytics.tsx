import { useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ChartNoAxesCombined, Wallet, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Case, Invoice } from "@/lib/domain";
import { overviewCharts } from "@/lib/overview-charts";
import { money, useMe } from "@/lib/store";
import { canViewInvoices } from "@/lib/access";
import "@/styles/overview.css";
const colors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
const tooltip = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
  borderRadius: 12,
  fontSize: 11,
  boxShadow: "0 12px 28px #00000020",
};
const ticks = { fontSize: 10, fill: "var(--muted-foreground)" };
export function OverviewAnalytics({ cases, invoices }: { cases: Case[]; invoices: Invoice[] }) {
  const [days, setDays] = useState(28),
    id = useId().replaceAll(":", ""),
    me = useMe();
  const data = useMemo(() => overviewCharts(cases, invoices, days), [cases, invoices, days]);
  const invoiceAccess = canViewInvoices(me);
  return (
    <div className="overview-analytics">
      <div className="analytics-main-grid">
        <section className="analytics-card">
          <header>
            <div>
              <p className="analytics-eyebrow">
                <ChartNoAxesCombined size={14} /> CASE INTAKE
              </p>
              <h2>Cases opened</h2>
              <p>New case records over the selected period</p>
            </div>
            <div className="chart-period" role="group" aria-label="Case intake period">
              {[7, 28, 90].map((n) => (
                <button key={n} aria-pressed={days === n} onClick={() => setDays(n)}>
                  {n} days
                </button>
              ))}
            </div>
          </header>
          <div className="analytics-total">
            <strong>{data.intakeTotal.toLocaleString()}</strong>
            <span>created in {days} days</span>
          </div>
          <div
            className="analytics-area"
            role="img"
            aria-label={`${data.intakeTotal} cases created in the last ${days} days`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.intake} margin={{ top: 12, right: 10, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.015} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 5" />
                <XAxis
                  dataKey="label"
                  tick={ticks}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={42}
                  tickMargin={10}
                />
                <YAxis allowDecimals={false} tick={ticks} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltip} labelStyle={{ color: "var(--foreground)" }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Cases opened"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill={`url(#${id})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {!data.intakeTotal && (
            <p className="chart-empty-note">No cases were created during this period.</p>
          )}
          <details className="chart-data">
            <summary>View daily counts</summary>
            <div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Cases opened</th>
                  </tr>
                </thead>
                <tbody>
                  {data.intake.map((d) => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      <td>{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
        <section className="analytics-card">
          <header>
            <div>
              <p className="analytics-eyebrow">
                <Activity size={14} /> CURRENT WORKLOAD
              </p>
              <h2>Case distribution</h2>
              <p>All cases you can access</p>
            </div>
          </header>
          <div
            className="analytics-donut"
            role="img"
            aria-label={`${cases.length} cases across five status groups`}
          >
            {cases.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.distribution.filter((x) => x.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="66%"
                    outerRadius="90%"
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={3}
                    isAnimationActive={false}
                  >
                    {data.distribution
                      .filter((x) => x.value > 0)
                      .map((x) => (
                        <Cell
                          key={x.name}
                          fill={colors[data.distribution.findIndex((g) => g.name === x.name)]}
                        />
                      ))}
                  </Pie>
                  <Tooltip contentStyle={tooltip} itemStyle={{ color: "var(--foreground)" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="donut-empty" />
            )}
            <div className="donut-center">
              <strong>{cases.length.toLocaleString()}</strong>
              <span>Total cases</span>
            </div>
          </div>
          <div className="donut-legend">
            {data.distribution.map((d, i) => (
              <div key={d.name}>
                <span className="chart-dot" style={{ background: colors[i] }} />
                <span>{d.name}</span>
                <strong>{d.value}</strong>
              </div>
            ))}
          </div>
          <p className="chart-footnote">
            Other includes rescheduled, skipped, vacated, vacant and cancelled cases.
          </p>
        </section>
      </div>
      <div className={`analytics-bottom-grid ${invoiceAccess ? "" : "single"}`}>
        <section className="analytics-card">
          <header>
            <div>
              <p className="analytics-eyebrow">
                <Activity size={14} /> SERVICE ACTIVITY
              </p>
              <h2>Open and completed</h2>
              <p>Last six weeks, grouped by service date</p>
            </div>
          </header>
          <div className="analytics-bars">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.services}
                barGap={6}
                margin={{ top: 15, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 5" />
                <XAxis dataKey="label" tick={ticks} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={ticks} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltip} cursor={{ fill: "var(--muted)" }} />
                <Bar
                  name="Open services"
                  dataKey="Open"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={16}
                  isAnimationActive={false}
                />
                <Bar
                  name="Completed services"
                  dataKey="Completed"
                  fill="var(--chart-2)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={16}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            <span>
              <i style={{ background: colors[0] }} /> Open services
            </span>
            <span>
              <i style={{ background: colors[1] }} /> Completed
            </span>
          </div>
          <p className="chart-footnote">
            Current case statuses on their service dates; this is not a historical status log.
          </p>
        </section>
        {invoiceAccess && (
          <section className="analytics-card">
            <header>
              <div>
                <p className="analytics-eyebrow">
                  <Wallet size={14} /> BILLING SNAPSHOT
                </p>
                <h2>Paid and outstanding</h2>
                <p>Last six months by invoice date; drafts excluded</p>
              </div>
              <Link to="/invoices" search={{ caseId: undefined }} aria-label="View invoices">
                <ArrowUpRight size={18} />
              </Link>
            </header>
            <div className="billing-mini-stats">
              <div>
                <span>Paid · all dates</span>
                <strong>{money(data.paid)}</strong>
              </div>
              <div>
                <span>Outstanding · all dates</span>
                <strong>{money(data.outstanding)}</strong>
              </div>
            </div>
            <div className="analytics-bars billing">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.months} margin={{ top: 8, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 5" />
                  <XAxis dataKey="label" tick={ticks} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={ticks}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(n) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`)}
                  />
                  <Tooltip
                    contentStyle={tooltip}
                    formatter={(v: any) => money(Number(v))}
                    cursor={{ fill: "var(--muted)" }}
                  />
                  <Bar
                    dataKey="Paid"
                    stackId="billing"
                    fill="var(--chart-3)"
                    maxBarSize={24}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="Outstanding"
                    stackId="billing"
                    fill="var(--chart-2)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend">
              <span>
                <i style={{ background: colors[2] }} /> Paid
              </span>
              <span>
                <i style={{ background: colors[1] }} /> Outstanding
              </span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
