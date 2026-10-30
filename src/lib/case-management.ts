import type { Case, Client, User } from "./mock-data";
import type { SavedView } from "./store";

export type SortKey = "number" | "title" | "status" | "serviceDate" | "fee" | "priority" | "client" | "staff";
export function filterCases(cases: Case[], filters: SavedView["filters"], clients: Client[], users: User[], userId?: string) {
  const query = filters.search.trim().toLowerCase();
  return cases.filter((c) => {
    const client = clients.find((x) => x.id === c.clientId);
    const staff = users.find((x) => x.id === c.staffId);
    return (!query || [c.number, c.title, c.residentName, c.residentAddress, c.type, client?.name, client?.company, staff?.name].join(" ").toLowerCase().includes(query))
      && (!filters.status.length || filters.status.includes(c.status))
      && (!filters.clientId || c.clientId === filters.clientId)
      && (!filters.staffId || c.staffId === filters.staffId)
      && (!filters.type || c.type === filters.type)
      && (!filters.dateFrom || c.serviceDate >= filters.dateFrom)
      && (!filters.dateTo || c.serviceDate <= filters.dateTo)
      && (!filters.mine || c.staffId === userId || c.managerId === userId);
  });
}
export function sortCases(cases: Case[], key: SortKey, descending: boolean, clients: Client[], users: User[]) {
  const value = (c: Case): string | number => key === "client" ? clients.find((x) => x.id === c.clientId)?.company ?? "" : key === "staff" ? users.find((x) => x.id === c.staffId)?.name ?? "" : key === "priority" ? ["Low", "Medium", "High", "Urgent"].indexOf(c.priority) : c[key];
  return [...cases].sort((a, b) => {
    const av = value(a), bv = value(b);
    return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))) * (descending ? -1 : 1);
  });
}
export function summarizeCases(cases: Case[], today: string) {
  const open = cases.filter((c) => c.status !== "Completed" && c.status !== "Cancelled");
  return { total: cases.length, active: cases.filter((c) => c.status === "Active").length, pending: cases.filter((c) => c.status === "Pending").length, completed: cases.filter((c) => c.status === "Completed").length, today: open.filter((c) => c.serviceDate === today).length, overdue: open.filter((c) => c.serviceDate < today).length };
}
export function caseCsv(cases: Case[], clients: Client[], users: User[]) {
  const escape = (value: string | number) => `"${String(value).replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
  return [["Case number", "Title", "Client", "Resident", "Type", "Status", "Priority", "Service date", "Assigned staff", "Fee", "Invoice status"], ...cases.map((c) => [c.number, c.title, clients.find((x) => x.id === c.clientId)?.company ?? "", c.residentName, c.type, c.status, c.priority, c.serviceDate, users.find((x) => x.id === c.staffId)?.name ?? "", c.fee, c.invoiceStatus])].map((row) => row.map(escape).join(",")).join("\r\n");
}