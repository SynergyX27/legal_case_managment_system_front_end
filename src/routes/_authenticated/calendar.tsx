import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, ChevronLeft, ChevronRight, Clock, MapPin, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMe, useStore, useVisibleCases, uid } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { calendarItems, localIso, monthGrid } from "@/lib/client-calendar";
import type { CalendarEvent } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar – LegalFlow" }, { name: "description", content: "Plan legal service dates, team events and daily schedules in LegalFlow." }, { property: "og:title", content: "Calendar – LegalFlow" }, { property: "og:description", content: "Service dates and team events in LegalFlow." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const me = useMe();
  const cases = useVisibleCases();
  const openCase = useUI((u) => u.openCase);
  const todayDate = new Date();
  const today = localIso(todayDate);
  const [month, setMonth] = useState(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const [draft, setDraft] = useState<CalendarEvent | null>(null);
  const visibleStaff = new Set(cases.flatMap((c) => [c.staffId, c.managerId]));
  const events = s.events.filter((e) => me?.role === "owner" || e.staffId === me?.id || visibleStaff.has(e.staffId));
  const items = calendarItems(cases, events);
  const dayItems = items.filter((i) => i.date === selected);
  const days = monthGrid(month.getFullYear(), month.getMonth());
  const newEvent = (date = selected) => setDraft({ id: uid("ev"), title: "", date, time: "09:00", staffId: me?.id ?? "", location: "", notes: "" });
  const moveMonth = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const save = () => { if (!draft?.title.trim() || !draft.date || !draft.time) return toast.error("Title, date and time are required"); s.upsertEvent({ ...draft, title: draft.title.trim() }); setSelected(draft.date); setDraft(null); toast.success("Calendar event saved"); };
  return <>
    <PageHeader title="Calendar" subtitle="Service dates and team events in one schedule" actions={<Button onClick={() => newEvent()}><CalendarPlus />Add event</Button>} />
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <section className="min-w-0 overflow-hidden rounded-lg border bg-card"><header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"><h2 className="font-display text-xl font-semibold">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2><div className="flex items-center gap-1"><Button variant="outline" size="sm" onClick={() => { setMonth(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)); setSelected(today); }}>Today</Button><Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft /></Button><Button variant="ghost" size="icon" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight /></Button></div></header>
        <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-[11px] font-medium uppercase text-muted-foreground">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}</div>
        <div className="grid grid-cols-7">{days.map((d) => { const date = localIso(d); const list = items.filter((i) => i.date === date); const outside = d.getMonth() !== month.getMonth(); return <button type="button" key={date} aria-label={`${d.toLocaleDateString("en-US", { month: "long", day: "numeric" })}, ${list.length} items`} onClick={() => setSelected(date)} onDoubleClick={() => newEvent(date)} className={cn("min-h-16 border-b border-r p-1.5 text-left transition-colors hover:bg-muted/60 sm:min-h-28", outside && "bg-muted/25 text-muted-foreground", selected === date && "bg-accent")}><span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs", date === today && "bg-primary font-semibold text-primary-foreground")}>{d.getDate()}</span><div className="mt-1 hidden space-y-1 sm:block">{list.slice(0, 2).map((i) => <div key={i.id} className={cn("truncate rounded-sm px-1.5 py-0.5 text-[10px]", i.kind === "service" ? "bg-info/10 text-info" : "bg-warning/15 text-foreground")}>{i.time} {i.title}</div>)}{list.length > 2 && <div className="px-1 text-[10px] text-muted-foreground">+{list.length - 2} more</div>}</div>{list.length > 0 && <span className="mt-1 block size-1.5 rounded-full bg-info sm:hidden" />}</button>; })}</div>
      </section>
      <aside className="xl:border-l xl:pl-6"><div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Schedule</p><h2 className="font-display text-2xl font-semibold">{new Date(selected + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</h2></div><Button variant="outline" size="icon" aria-label="Add event on selected date" onClick={() => newEvent()}><CalendarPlus /></Button></div><div className="mb-4 flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-info" />Case services</span><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-warning" />Team events</span></div>
        <div className="divide-y border-y">{dayItems.map((i) => <div key={i.id} className="flex gap-3 py-4"><span className={cn("mt-1 size-2.5 shrink-0 rounded-full", i.kind === "service" ? "bg-info" : "bg-warning")} /><div className="min-w-0 flex-1"><div className="font-medium">{i.title}</div><div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3" />{i.time}</div><div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3" /><span className="truncate">{i.detail}</span></div></div>{i.kind === "service" ? <Button variant="ghost" size="sm" onClick={() => openCase(i.caseId)}>Open</Button> : <div className="flex"><Button variant="ghost" size="icon" aria-label={`Edit ${i.title}`} onClick={() => { if (i.event) setDraft({ ...i.event }); }}><Pencil className="size-3.5" /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${i.title}`} onClick={() => { s.deleteEvent(i.id); toast.success("Calendar event deleted"); }}><Trash2 className="size-3.5" /></Button></div>}</div>)}{!dayItems.length && <div className="py-12 text-center text-sm text-muted-foreground">Nothing scheduled for this day.<br /><Button variant="link" onClick={() => newEvent()}>Add an event</Button></div>}</div>
      </aside>
    </div>
    <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}><DialogContent><DialogHeader><DialogTitle>{s.events.some((e) => e.id === draft?.id) ? "Edit event" : "Add calendar event"}</DialogTitle></DialogHeader>{draft && <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5 sm:col-span-2"><Label htmlFor="event-title">Title</Label><Input id="event-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div><div className="space-y-1.5"><Label htmlFor="event-date">Date</Label><Input id="event-date" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div><div className="space-y-1.5"><Label htmlFor="event-time">Time</Label><Input id="event-time" type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></div><div className="space-y-1.5"><Label>Team member</Label><Select value={draft.staffId} onValueChange={(v) => setDraft({ ...draft, staffId: v })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{s.users.filter((u) => u.status === "Active").map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label htmlFor="event-location">Location</Label><Input id="event-location" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /></div><div className="space-y-1.5 sm:col-span-2"><Label htmlFor="event-notes">Notes</Label><Textarea id="event-notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div></div>}<DialogFooter><Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button><Button onClick={save}>Save event</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
