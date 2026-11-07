import { caseBilling } from "./billing";
import type { Case, Client, User, Invoice } from "./domain";
import type { SavedView } from "./store";

export type SortKey =
  "number" | "title" | "status" | "serviceDate" | "fee" | "priority" | "client" | "staff";
export function filterCases(
  cases: Case[],
  filters: SavedView["filters"],
  clients: Client[],
  users: User[],
  userId?: string,
) {
  const query = filters.search.trim().toLowerCase();
  return cases.filter((c) => {
    const client = clients.find((x) => x.id === c.clientId);
    const staff = users.find((x) => x.id === c.staffId);
    return (
      (!query ||
        [
          c.ref,
          c.plaintiff,
          c.county,
          c.city,
          c.state,
          c.zip,
          c.visLO,
          c.visTO,
          c.locs,
          c.lbx,
          c.number,
          c.title,
          c.residentName,
          c.residentAddress,
          c.type,
          client?.name,
          client?.company,
          staff?.name,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)) &&
      (!filters.status.length || filters.status.includes(c.status)) &&
      (!filters.clientId || c.clientId === filters.clientId) &&
      (!filters.staffId || c.staffId === filters.staffId) &&
      (!filters.type || c.type === filters.type) &&
      (!filters.dateFrom || c.serviceDate >= filters.dateFrom) &&
      (!filters.dateTo || c.serviceDate <= filters.dateTo) &&
      (!filters.mine || c.staffId === userId || c.managerId === userId)
    );
  });
}
export function sortCases(
  cases: Case[],
  key: SortKey,
  descending: boolean,
  clients: Client[],
  users: User[],
) {
  const value = (c: Case): string | number =>
    key === "client"
      ? (clients.find((x) => x.id === c.clientId)?.company ?? "")
      : key === "staff"
        ? (users.find((x) => x.id === c.staffId)?.name ?? "")
        : key === "priority"
          ? ["Low", "Medium", "High", "Urgent"].indexOf(c.priority)
          : c[key];
  return [...cases].sort((a, b) => {
    const av = value(a),
      bv = value(b);
    return (
      (typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv))) * (descending ? -1 : 1)
    );
  });
}
export function summarizeCases(cases: Case[], today: string) {
  const open = cases.filter((c) => c.status !== "Completed" && c.status !== "Cancelled");
  return {
    total: cases.length,
    active: cases.filter((c) => c.status === "Active").length,
    pending: cases.filter((c) => c.status === "Pending").length,
    completed: cases.filter((c) => c.status === "Completed").length,
    today: open.filter((c) => c.serviceDate === today).length,
    overdue: open.filter((c) => c.serviceDate < today).length,
  };
}
export function caseCsv(
  cases: Case[],
  clients: Client[],
  users: User[],
  invoices: Invoice[] = [],
  includeFinancial = true,
) {
  const escape = (value: string | number) =>
    `"${String(value)
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""')}"`;
  return [
    [
      "REF",
      "Case number",
      "Title",
      "Customer",
      "Plaintiff",
      "Tenant",
      "Address",
      "County",
      "City",
      "State",
      "Zip",
      "Type",
      "Status",
      "Priority",
      "Setout Date",
      "Setout Time",
      "Assigned staff",
      "Last payment",
      "Last payment date",
      "Balance owed",
      "VIS - LO",
      "VIS - TO",
      "LOCS",
      "LBX",
    ],
    ...cases.map((c) => {
      const b = caseBilling(invoices, c.id);
      return [
        c.ref ?? "",
        c.number,
        c.title,
        clients.find((x) => x.id === c.clientId)?.company ?? "",
        c.plaintiff ?? "",
        c.residentName,
        c.residentAddress,
        c.county ?? "",
        c.city ?? "",
        c.state ?? "",
        c.zip ?? "",
        c.type,
        c.status,
        c.priority,
        c.serviceDate,
        c.serviceTime,
        users.find((x) => x.id === c.staffId)?.name ?? "",
        includeFinancial ? b.lastPayment : "",
        includeFinancial ? b.lastPaymentDate : "",
        includeFinancial ? b.balance : "",
        c.visLO ?? "",
        c.visTO ?? "",
        c.locs ?? "",
        c.lbx ?? "",
      ];
    }),
  ]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
}
