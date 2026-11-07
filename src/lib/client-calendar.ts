import { totalFor } from "./billing";
import type { CalendarEvent, Case, Client, Invoice } from "./domain";

export function clientMetrics(client: Client, cases: Case[], invoices?: Invoice[]) {
  const clientCases = cases.filter((c) => c.clientId === client.id);
  return {
    total: clientCases.length,
    open: clientCases.filter((c) => !["Completed", "Cancelled"].includes(c.status)).length,
    billed: invoices
      ? invoices
          .filter(
            (i) =>
              i.clientId === client.id &&
              i.status !== "Draft" &&
              clientCases.some((c) => c.id === i.caseId),
          )
          .reduce((sum, i) => sum + totalFor(i), 0)
      : clientCases
          .filter((c) => c.invoiceStatus !== "Not Invoiced")
          .reduce((sum, c) => sum + c.fee, 0),
    lastService:
      [...clientCases].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))[0]?.serviceDate ??
      "",
  };
}
export function filterClients(clients: Client[], query: string, status: string) {
  const q = query.trim().toLowerCase();
  return clients.filter(
    (c) =>
      (!status || c.status === status) &&
      (!q || [c.name, c.company, c.email, c.phone, c.address].join(" ").toLowerCase().includes(q)),
  );
}
export type CalendarItem = {
  id: string;
  date: string;
  time: string;
  title: string;
  detail: string;
  kind: "service" | "event";
  caseId?: string;
  event?: CalendarEvent;
};
export function calendarItems(cases: Case[], events: CalendarEvent[]) {
  return [
    ...cases
      .filter((c) => c.status !== "Cancelled")
      .map((c): CalendarItem => ({
        id: c.id,
        date: c.serviceDate,
        time: c.serviceTime,
        title: c.number,
        detail: `${c.type} · ${c.residentName}`,
        kind: "service",
        caseId: c.id,
      })),
    ...events.map((e): CalendarItem => ({
      id: e.id,
      date: e.date,
      time: e.time,
      title: e.title,
      detail: e.location || "No location",
      kind: "event",
      event: e,
    })),
  ].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}
export function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from(
    { length: 42 },
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
}
export const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
