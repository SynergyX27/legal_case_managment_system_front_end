import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CalendarClock,
  CheckCheck,
  CircleCheck,
  Clock3,
  FolderOpen,
  MessageCircle,
  Plus,
  Receipt,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Avatar, StatusBadge } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { useMe, useStore, useVisibleCases, fmtDate, money } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { iso, STATUSES } from "@/lib/domain";
import { summarizeCases } from "@/lib/case-management";
import { caseBilling } from "@/lib/billing";
export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Overview – LegalFlow" }] }),
  component: Page,
});
function Page() {
  const me = useMe(),
    cases = useVisibleCases(),
    s = useStore(),
    ui = useUI();
  const [weeks, setWeeks] = useState(4);
  const today = iso(new Date()),
    stats = summarizeCases(cases, today),
    customer = me?.role === "customer";
  const open = cases.filter((c) => !["Completed", "Cancelled"].includes(c.status));
  const upcoming = open
    .filter((c) => c.serviceDate >= today)
    .sort((a, b) => (a.serviceDate + a.serviceTime).localeCompare(b.serviceDate + b.serviceTime))
    .slice(0, 4);
  const recent = [...cases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const activities = s.activities
    .filter((a) => cases.some((c) => c.id === a.caseId))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 4);
  const balance = cases.reduce((n, c) => n + caseBilling(s.invoices, c.id).balance, 0);
  const chart = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(today + "T00:00:00");
    start.setDate(start.getDate() - (Math.floor(weeks / 2) - i) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const from = iso(start),
      to = iso(end);
    return {
      week: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      Scheduled: open.filter((c) => c.serviceDate >= from && c.serviceDate <= to).length,
      Completed: cases.filter(
        (c) => c.status === "Completed" && c.serviceDate >= from && c.serviceDate <= to,
      ).length,
    };
  });
  const statusColor: Record<string, string> = {
    Active: "#285ba7",
    Pending: "#e2b86c",
    Scheduled: "#7a9cc2",
    Completed: "#abd7c1",
    Cancelled: "#d7e0dc",
  };
  const metrics = customer
    ? [
        {
          label: "Your case files",
          value: stats.total,
          icon: FolderOpen,
          detail: "Cases linked to your account",
        },
        {
          label: "In progress",
          value: open.length,
          icon: Clock3,
          detail: "Your active and upcoming cases",
        },
        {
          label: "Invoice balance",
          value: money(balance),
          icon: Receipt,
          detail: "Issued invoices awaiting payment",
        },
        {
          label: "Completed",
          value: stats.completed,
          icon: CircleCheck,
          detail: "Services completed for you",
        },
      ]
    : [
        {
          label: "Total case files",
          value: stats.total,
          icon: FolderOpen,
          detail: `${stats.active} currently active`,
        },
        {
          label: "Pending cases",
          value: stats.pending,
          icon: Clock3,
          detail: "Ready for your next action",
        },
        {
          label: "Services today",
          value: stats.today,
          icon: CalendarClock,
          detail: `${upcoming.length} upcoming services`,
        },
        {
          label: "Completed cases",
          value: stats.completed,
          icon: CircleCheck,
          detail: `${stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}% of your case files`,
        },
      ];
  return (
    <>
      <section className="overview-hero">
        <div>
          <p className="hero-kicker">
            {customer ? "Your personal case workspace" : "Your workspace, at a glance"}
          </p>
          <h1>
            Good{" "}
            {new Date().getHours() < 12
              ? "morning"
              : new Date().getHours() < 18
                ? "afternoon"
                : "evening"}
            , {me?.name.split(" ")[0]}
            <span className="font-normal text-[#b3cbed]">.</span>
          </h1>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-white/60">
            {customer
              ? "A clear view of your cases, appointments and conversations."
              : "Here's what's happening across your cases and team today."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {customer ? (
              <Button
                className="bg-white text-[#193e72] hover:bg-white/90"
                onClick={() => ui.openChat()}
              >
                <MessageCircle />
                Talk to your team
              </Button>
            ) : (
              <Button
                className="bg-white text-[#193e72] hover:bg-white/90"
                onClick={() => ui.openCase()}
              >
                <Plus />
                Create a case
              </Button>
            )}
            <Link
              to="/cases"
              className="flex items-center gap-2 px-2 text-xs font-medium text-white/80"
            >
              View case files <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
        <div className="hero-action">
          <CalendarClock className="size-7 text-[#b3cbed]" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/50">
              {new Date().toLocaleDateString(undefined, { weekday: "long" })}
            </p>
            <p className="mt-1 text-sm font-semibold">
              {new Date().toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="mt-2 text-[10px] text-[#b3cbed]">
              {stats.today} service{stats.today === 1 ? "" : "s"} on today's schedule
            </p>
          </div>
        </div>
      </section>
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, detail }, i) => (
          <section key={label} className="metric-card">
            <div className="flex items-center justify-between gap-2">
              <p className="metric-label">{label}</p>
              <span
                className={`flex size-8 items-center justify-center rounded-xl ${i === 1 ? "bg-amber-50 text-amber-600" : i === 2 ? "bg-blue-50 text-blue-600" : "bg-primary/8 text-primary"}`}
              >
                <Icon className="size-4" />
              </span>
            </div>
            <p className="metric-value">{value}</p>
            <p className="metric-footer">
              <span className="size-1 rounded-full bg-primary/50" />
              {detail}
            </p>
          </section>
        ))}
      </div>
      {customer ? (
        <div className="mb-6 grid gap-6 xl:grid-cols-[1.65fr_1fr]">
          <section className="overview-card">
            <div className="mb-6 flex items-center justify-between">
              <h2>Your case files</h2>
              <Link to="/cases" className="text-xs font-medium text-primary">
                View all <ArrowUpRight className="inline size-3" />
              </Link>
            </div>
            {cases.slice(0, 5).map((c) => (
              <Link
                to="/cases/$id"
                params={{ id: c.id }}
                key={c.id}
                className="mb-3 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 transition hover:border-primary/30 hover:bg-accent/30"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-accent p-3 text-primary">
                    <FolderOpen className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{c.number}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.residentName} · {c.type}
                    </p>
                  </div>
                </div>
                <StatusBadge value={c.status} />
              </Link>
            ))}
            {!cases.length && (
              <div className="py-14 text-center">
                <FolderOpen className="mx-auto mb-3 size-8 text-primary/40" />
                <h3 className="text-sm font-semibold">Your workspace is ready</h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  Your team will link your cases to this account.
                </p>
              </div>
            )}
          </section>
          <section className="overview-card">
            <p className="section-eyebrow mb-3">We're here for you</p>
            <h2>Meet your case team</h2>
            <p className="mb-5 mt-3 text-xs leading-relaxed text-muted-foreground">
              A question about an appointment or invoice? Start a conversation with the people
              handling your case.
            </p>
            {s.users
              .filter(
                (u) =>
                  u.role === "owner" ||
                  cases.some((c) => c.staffId === u.id || c.managerId === u.id),
              )
              .slice(0, 4)
              .map((u) => (
                <button
                  key={u.id}
                  className="mb-3 flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-accent"
                  onClick={() => ui.openChat(u.id)}
                >
                  <Avatar name={u.name} className="size-9 rounded-xl" />
                  <span className="flex-1">
                    <span className="block text-xs font-semibold">{u.name}</span>
                    <span className="mt-1 block text-[10px] capitalize text-muted-foreground">
                      {u.title}
                    </span>
                  </span>
                  <MessageCircle className="size-4 text-primary" />
                </button>
              ))}
          </section>
        </div>
      ) : (
        <div className="mb-6 grid gap-6 xl:grid-cols-[1.65fr_1fr]">
          <section className="overview-card">
            <div className="mb-7 flex items-center justify-between gap-3">
              <div>
                <h2>Service activity</h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Scheduled and completed services over time
                </p>
              </div>
              <div className="flex rounded-xl border bg-background p-1">
                {[4, 8].map((n) => (
                  <button
                    key={n}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-medium ${weeks === n ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
                    onClick={() => setWeeks(n)}
                  >
                    {n} weeks
                  </button>
                ))}
              </div>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chart}
                  barGap={5}
                  margin={{ top: 10, right: 4, bottom: 0, left: -20 }}
                >
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="week"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickMargin={12}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{
                      borderRadius: 14,
                      borderColor: "var(--border)",
                      background: "var(--card)",
                      color: "var(--foreground)",
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    isAnimationActive={false}
                    dataKey="Scheduled"
                    fill="#285ba7"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={24}
                  />
                  <Bar
                    isAnimationActive={false}
                    dataKey="Completed"
                    fill="#b9cfee"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-5 flex justify-center gap-5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-sm bg-primary" />
                Scheduled
              </span>
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-sm bg-[#b9cfee]" />
                Completed
              </span>
            </div>
          </section>
          <section className="overview-card">
            <h2>Case distribution</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              A snapshot of your current workload
            </p>
            <div className="mb-6 mt-8 flex h-3 gap-1 overflow-hidden rounded-full">
              {STATUSES.map((st) => (
                <div
                  key={st}
                  style={{
                    background: statusColor[st],
                    width: `${stats.total ? (cases.filter((c) => c.status === st).length / stats.total) * 100 : 0}%`,
                  }}
                />
              ))}
            </div>
            <div className="space-y-4">
              {STATUSES.map((st) => {
                const n = cases.filter((c) => c.status === st).length;
                return (
                  <div key={st} className="flex items-center gap-3 text-xs">
                    <span className="size-2 rounded-full" style={{ background: statusColor[st] }} />
                    <span className="flex-1 text-muted-foreground">{st}</span>
                    <span className="font-semibold tabular-nums">{n}</span>
                    <span className="w-8 text-right text-[10px] text-muted-foreground">
                      {stats.total ? Math.round((n / stats.total) * 100) : 0}%
                    </span>
                  </div>
                );
              })}
            </div>
            {stats.overdue > 0 && (
              <Link
                to="/cases"
                className="mt-6 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[10px] text-amber-700"
              >
                <Clock3 className="size-3.5" />
                {stats.overdue} overdue services to review
                <ArrowUpRight className="ml-auto size-3" />
              </Link>
            )}
          </section>
        </div>
      )}
      <div className="mb-6 grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <section className="overview-card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2>{customer ? "Upcoming appointments" : "Upcoming services"}</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                The next dates on your schedule
              </p>
            </div>
            {!customer && (
              <Link to="/calendar" className="text-xs text-primary">
                View calendar <ArrowUpRight className="inline size-3" />
              </Link>
            )}
          </div>
          <div className="divide-y">
            {upcoming.map((c) => (
              <Link
                to="/cases/$id"
                params={{ id: c.id }}
                key={c.id}
                className="flex items-center gap-3 py-4"
              >
                <div className="schedule-date">
                  <small>
                    {new Date(c.serviceDate + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short",
                    })}
                  </small>
                  <strong>{Number(c.serviceDate.slice(-2))}</strong>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">
                    {c.number}{" "}
                    <span className="font-normal text-muted-foreground">· {c.residentName}</span>
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{c.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">{c.serviceTime}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {s.users.find((u) => u.id === c.staffId)?.name.split(" ")[0]}
                  </p>
                </div>
                <ArrowUpRight className="ml-2 size-4 text-muted-foreground" />
              </Link>
            ))}
            {!upcoming.length && (
              <p className="py-10 text-center text-xs text-muted-foreground">
                No upcoming services. Your schedule is clear.
              </p>
            )}
          </div>
        </section>
        <section className="overview-card">
          <div className="mb-6 flex justify-between">
            <h2>{customer ? "Your invoice summary" : "Recent activity"}</h2>
            {customer ? (
              <Receipt className="size-4 text-muted-foreground" />
            ) : (
              <Activity className="size-4 text-muted-foreground" />
            )}
          </div>
          {customer ? (
            <>
              <p className="section-eyebrow">Outstanding balance</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight">{money(balance)}</p>
              <p className="mb-6 mt-3 text-xs leading-relaxed text-muted-foreground">
                Your issued service invoices, all in one place.
              </p>
              <Link
                to="/invoices"
                search={{ caseId: undefined }}
                className="flex items-center justify-between rounded-xl bg-accent p-4 text-xs font-semibold text-primary"
              >
                View your invoices <ArrowUpRight className="size-4" />
              </Link>
            </>
          ) : (
            <div>
              {activities.map((a, i) => (
                <div key={a.id} className="relative flex gap-3 pb-6">
                  {i < activities.length - 1 && (
                    <span className="absolute bottom-1 left-[15px] top-8 w-px bg-border" />
                  )}
                  <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background">
                    <CheckCheck className="size-3.5 text-primary" />
                  </span>
                  <div>
                    <Link
                      to="/cases/$id"
                      params={{ id: a.caseId }}
                      className="line-clamp-2 text-xs leading-relaxed hover:text-primary"
                    >
                      {a.text}
                    </Link>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {a.by.split(" ")[0]} · {fmtDate(a.at)}
                    </p>
                  </div>
                </div>
              ))}
              {!activities.length && (
                <p className="py-10 text-center text-xs text-muted-foreground">
                  Your latest updates will appear here.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
      {!customer && (
        <section className="overview-card mb-6 !p-0">
          <div className="flex items-center justify-between px-6 py-5">
            <h2>Recently updated cases</h2>
            <Link to="/cases" className="text-xs font-medium text-primary">
              All cases <ArrowUpRight className="inline size-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr>
                  {["Case file", "Customer", "Status", "Setout date", "Assigned to"].map((h) => (
                    <th key={h} className="px-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {recent.map((c) => (
                  <tr key={c.id}>
                    <td className="px-6">
                      <Link
                        to="/cases/$id"
                        params={{ id: c.id }}
                        className="font-semibold text-primary"
                      >
                        {c.number}
                      </Link>
                      <p className="mt-1 text-[10px] text-muted-foreground">{c.type}</p>
                    </td>
                    <td className="px-6">
                      {s.clients.find((cl) => cl.id === c.clientId)?.company}
                    </td>
                    <td className="px-6">
                      <StatusBadge value={c.status} />
                    </td>
                    <td className="px-6 text-muted-foreground">{fmtDate(c.serviceDate)}</td>
                    <td className="px-6">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={s.users.find((u) => u.id === c.staffId)?.name ?? "?"}
                          className="size-6 text-[9px]"
                        />
                        {s.users.find((u) => u.id === c.staffId)?.name}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!recent.length && (
              <p className="p-10 text-center text-xs text-muted-foreground">No case files yet.</p>
            )}
          </div>
        </section>
      )}
    </>
  );
}
