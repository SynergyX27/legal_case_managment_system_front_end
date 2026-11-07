import type { Case, Client, Invoice, User } from "./domain";
import { STATUSES } from "./domain";
import { totalFor } from "./billing";
export function buildReports(cases: Case[], invoices: Invoice[], users: User[], clients: Client[]) {
  const related = invoices.filter((i) => cases.some((c) => c.id === i.caseId));
  const sum = (statuses: string[]) =>
    related.filter((i) => statuses.includes(i.status)).reduce((n, i) => n + totalFor(i), 0);
  const completed = cases.filter((c) => c.status === "Completed").length;
  return {
    total: cases.length,
    completed,
    completionRate: cases.length ? Math.round((completed / cases.length) * 100) : 0,
    open: cases.filter((c) => !["Completed", "Cancelled"].includes(c.status)).length,
    paid: sum(["Paid"]),
    outstanding: sum(["Sent", "Overdue"]),
    overdue: sum(["Overdue"]),
    draft: sum(["Draft"]),
    statuses: STATUSES.map((status) => ({
      status,
      count: cases.filter((c) => c.status === status).length,
    })),
    billing: ["Draft", "Sent", "Paid", "Overdue"].map((status) => ({
      status,
      count: related.filter((i) => i.status === status).length,
      amount: sum([status]),
    })),
    staff: users
      .filter((u) => cases.some((c) => c.staffId === u.id))
      .map((u) => {
        const assigned = cases.filter((c) => c.staffId === u.id);
        return {
          id: u.id,
          name: u.name,
          total: assigned.length,
          open: assigned.filter((c) => !["Completed", "Cancelled"].includes(c.status)).length,
          completed: assigned.filter((c) => c.status === "Completed").length,
        };
      })
      .sort((a, b) => b.open - a.open),
    clients: clients
      .filter((cl) => cases.some((c) => c.clientId === cl.id))
      .map((cl) => {
        const owned = cases.filter((c) => c.clientId === cl.id),
          billing = related.filter((i) => i.clientId === cl.id);
        return {
          id: cl.id,
          name: cl.company || cl.name,
          total: owned.length,
          completed: owned.filter((c) => c.status === "Completed").length,
          paid: billing.filter((i) => i.status === "Paid").reduce((n, i) => n + totalFor(i), 0),
          outstanding: billing
            .filter((i) => ["Sent", "Overdue"].includes(i.status))
            .reduce((n, i) => n + totalFor(i), 0),
        };
      })
      .sort((a, b) => b.total - a.total),
  };
}
export function reportCsv(report: ReturnType<typeof buildReports>) {
  const rows: (string | number)[][] = [
    ["Section", "Label", "Count", "Amount (USD)"],
    ["Summary", "Total cases", report.total, ""],
    ["Summary", "Open cases", report.open, ""],
    ["Summary", "Completed cases", report.completed, ""],
    ["Summary", "Completion rate (%)", report.completionRate, ""],
    ...report.statuses.map((x) => ["Case status", x.status, x.count, ""]),
    ...report.billing.map((x) => ["Invoice status", x.status, x.count, x.amount.toFixed(2)]),
    ...report.staff.flatMap((x) => [
      ["Staff total", x.name, x.total, ""],
      ["Staff open", x.name, x.open, ""],
      ["Staff completed", x.name, x.completed, ""],
    ]),
    ...report.clients.flatMap((x) => [
      ["Customer cases", x.name, x.total, ""],
      ["Customer completed", x.name, x.completed, ""],
      ["Customer paid", x.name, "", x.paid.toFixed(2)],
      ["Customer outstanding", x.name, "", x.outstanding.toFixed(2)],
    ]),
  ];
  return rows
    .map((row) =>
      row
        .map(
          (v) =>
            '"' +
            String(v)
              .replace(/^[=+@-]/, "'$&")
              .replaceAll('"', '""') +
            '"',
        )
        .join(","),
    )
    .join("\r\n");
}
