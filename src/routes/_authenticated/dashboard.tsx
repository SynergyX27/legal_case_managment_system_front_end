import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BriefcaseBusiness, CalendarClock, CircleCheck, Clock3, Plus, ArrowUpRight, AlertCircle, Activity } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Avatar, StatusBadge } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { useMe, useStore, useVisibleCases, fmtDate } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { iso, STATUSES } from "@/lib/mock-data";
import { summarizeCases } from "@/lib/case-management";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard – LegalFlow" }, { name: "description", content: "Your LegalFlow workspace overview: case activity, upcoming services and outstanding work." }, { property: "og:title", content: "Dashboard – LegalFlow" }, { property: "og:description", content: "Case activity, upcoming services and outstanding work in LegalFlow." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  const me = useMe();
  const cases = useVisibleCases();
  const s = useStore();
  const openCase = useUI((u) => u.openCase);
  const [weeks, setWeeks] = useState(4);
  const today = iso(new Date());
  const stats = summarizeCases(cases, today);
  const open = cases.filter((c) => !["Completed", "Cancelled"].includes(c.status));
  const upcoming = open.filter((c) => c.serviceDate >= today).sort((a, b) => (a.serviceDate + a.serviceTime).localeCompare(b.serviceDate + b.serviceTime)).slice(0, 5);
  const activity = s.activities.filter((a) => cases.some((c) => c.id === a.caseId)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  const recent = [...cases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const chartData = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(today + "T00:00:00"); start.setDate(start.getDate() - (Math.floor(weeks / 2) - i) * 7);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    const from = iso(start), to = iso(end);
    return { week: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }), Scheduled: open.filter((c) => c.serviceDate >= from && c.serviceDate <= to).length, Completed: cases.filter((c) => c.status === "Completed" && c.serviceDate >= from && c.serviceDate <= to).length };
  });
  const statusTone: Record<string, string> = { Active: "bg-info", Pending: "bg-warning", Scheduled: "bg-primary", Completed: "bg-success", Cancelled: "bg-muted-foreground" };
  return <>
    <PageHeader title="Dashboard" subtitle={`Welcome back, ${me?.name.split(" ")[0] ?? "team"}. ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`} actions={<Button onClick={() => openCase()}><Plus />New case</Button>} />
    <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[{ label: "Total case files", value: stats.total, detail: "Across your workspace", icon: BriefcaseBusiness, tone: "text-primary bg-accent" }, { label: "Active cases", value: stats.active, detail: `${stats.pending} pending cases`, icon: Clock3, tone: "text-info bg-info/10" }, { label: "Services today", value: stats.today, detail: `${upcoming.length} upcoming on the schedule`, icon: CalendarClock, tone: "text-warning bg-warning/10" }, { label: "Completed cases", value: stats.completed, detail: `${stats.total ? Math.round(stats.completed / stats.total * 100) : 0}% of all case files`, icon: CircleCheck, tone: "text-success bg-success/10" }].map((item) => <div key={item.label} className="rounded-lg border bg-card p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{item.label}</span><span className={`flex size-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="size-4" /></span></div><div className="mt-2 text-3xl font-semibold tabular-nums">{item.value}</div><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></div>)}
    </div>
    {stats.overdue > 0 && <div className="mb-7 flex flex-wrap items-center gap-3 border-y border-warning/30 bg-warning/10 px-4 py-3"><AlertCircle className="size-4 text-warning" /><span className="flex-1 text-sm"><strong>{stats.overdue} overdue service{stats.overdue === 1 ? "" : "s"}</strong> · Awaiting a new service date</span><Button variant="ghost" size="sm" onClick={() => { const c = open.find((c) => c.serviceDate < today); if (c) openCase(c.id); }}>Review case<ArrowUpRight /></Button></div>}
    <div className="mb-7 grid gap-8 lg:grid-cols-[1.65fr_1fr]">
      <section className="min-w-0"><header className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Service activity</h2><p className="mt-1 text-xs text-muted-foreground">Recent and upcoming services by week</p></div><div className="flex gap-1">{[4, 8].map((n) => <Button key={n} size="sm" variant={weeks === n ? "secondary" : "ghost"} onClick={() => setWeeks(n)}>{n} weeks</Button>)}</div></header>
        <div className="h-60 w-full" aria-label="Weekly service activity chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} barGap={4}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><Tooltip cursor={false} /><Bar dataKey="Scheduled" fill="var(--info)" radius={[3, 3, 0, 0]} maxBarSize={36} /><Bar dataKey="Completed" fill="var(--success)" radius={[3, 3, 0, 0]} maxBarSize={36} /></BarChart></ResponsiveContainer></div><div className="mt-3 flex justify-center gap-5 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-info" />Scheduled</span><span className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-success" />Completed</span></div>
      </section>
      <section className="lg:border-l lg:pl-8"><h2 className="mb-1 font-semibold">Case breakdown</h2><p className="mb-5 text-xs text-muted-foreground">Current status of {stats.total} case files</p><div className="space-y-4">{STATUSES.map((status) => { const count = cases.filter((c) => c.status === status).length; return <div key={status}><div className="mb-1.5 flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className={`size-2 rounded-full ${statusTone[status]}`} />{status}</span><span className="font-medium tabular-nums">{count}</span></div><div role="progressbar" aria-label={`${status} cases`} aria-valuenow={count} aria-valuemax={stats.total} className="h-1.5 overflow-hidden rounded-sm bg-muted"><div className={`h-full ${statusTone[status]}`} style={{ width: `${stats.total ? count / stats.total * 100 : 0}%` }} /></div></div>; })}</div></section>
    </div>
    <div className="mb-7 grid gap-8 border-t pt-6 xl:grid-cols-2">
      <section><header className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Upcoming services</h2><CalendarClock className="size-4 text-muted-foreground" /></header><div className="divide-y">{upcoming.map((c) => { const staff = s.users.find((u) => u.id === c.staffId); return <div key={c.id} className="flex items-center gap-3 py-3"><div className="flex w-12 shrink-0 flex-col items-center border-r pr-3"><span className="text-[10px] uppercase text-muted-foreground">{new Date(c.serviceDate + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}</span><span className="text-xl font-semibold">{Number(c.serviceDate.slice(-2))}</span></div><div className="min-w-0 flex-1"><Button variant="link" className="h-auto p-0 text-info" onClick={() => openCase(c.id)}>{c.number}</Button><div className="truncate text-xs text-muted-foreground">{c.type} · {c.residentName}</div></div><div className="text-right"><div className="text-xs font-medium">{c.serviceTime}</div><div className="text-xs text-muted-foreground">{staff?.name.split(" ")[0]}</div></div></div>; })}{!upcoming.length && <p className="py-8 text-sm text-muted-foreground">No upcoming services.</p>}</div></section>
      <section><header className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Recent activity</h2><Activity className="size-4 text-muted-foreground" /></header><div className="divide-y">{activity.map((a) => <div key={a.id} className="flex items-start gap-3 py-3"><Avatar name={a.by} /><div className="min-w-0 flex-1"><div className="truncate text-sm" title={a.text}>{a.text}</div><div className="text-xs text-muted-foreground">{a.by} · {fmtDate(a.at)}</div></div><Button variant="ghost" size="icon" aria-label={`Open activity case ${a.caseId}`} onClick={() => openCase(a.caseId)}><ArrowUpRight className="size-4" /></Button></div>)}{!activity.length && <p className="py-8 text-sm text-muted-foreground">No recent activity.</p>}</div></section>
    </div>
    <section className="border-t pt-6"><h2 className="mb-4 font-semibold">Recently updated cases</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="pb-3 font-medium">Case file</th><th className="pb-3 font-medium">Client</th><th className="pb-3 font-medium">Status</th><th className="whitespace-nowrap pb-3 font-medium">Service date</th><th className="pb-3 font-medium">Assigned to</th></tr></thead><tbody className="divide-y">{recent.map((c) => <tr key={c.id}><td className="min-w-48 py-3 pr-4"><Button variant="link" className="h-auto p-0 text-info" onClick={() => openCase(c.id)}>{c.number}</Button><div className="text-xs text-muted-foreground">{c.type}</div></td><td className="min-w-44 pr-4">{s.clients.find((cl) => cl.id === c.clientId)?.company}</td><td className="pr-4"><StatusBadge value={c.status} /></td><td className="whitespace-nowrap pr-4">{fmtDate(c.serviceDate)}</td><td className="whitespace-nowrap">{s.users.find((u) => u.id === c.staffId)?.name}</td></tr>)}</tbody></table>{!recent.length && <p className="py-8 text-sm text-muted-foreground">No case files yet.</p>}</div></section>
  </>;
}
