import type { Case, Invoice } from "./domain";
import { invoiceCaseIds, invoiceTotals } from "./invoice-math";
const day = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function overviewCharts(cases: Case[], invoices: Invoice[], days = 28, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  const intake = Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return {
      date: day(d),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: 0,
    };
  });
  const byDay = new Map(intake.map((x) => [x.date, x]));
  for (const c of cases) {
    const created = new Date(c.createdAt);
    if (Number.isFinite(created.getTime())) {
      const bucket = byDay.get(day(created));
      if (bucket) bucket.count++;
    }
  }
  const groups = ["Active", "Pending", "Scheduled", "Completed", "Other"];
  const distribution = groups.map((name) => ({
    name,
    value: cases.filter((c) =>
      name === "Other" ? !groups.slice(0, 4).includes(c.status) : c.status === name,
    ).length,
  }));
  const services = Array.from({ length: 6 }, (_, i) => {
    const from = new Date(end);
    from.setDate(from.getDate() - (5 - i) * 7 - 6);
    const to = new Date(from);
    to.setDate(to.getDate() + 6);
    const a = day(from),
      b = day(to);
    const rows = cases.filter((c) => c.serviceDate >= a && c.serviceDate <= b);
    return {
      label: from.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      Open: rows.filter((c) => !["Completed", "Cancelled"].includes(c.status)).length,
      Completed: rows.filter((c) => c.status === "Completed").length,
    };
  });
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(end.getFullYear(), end.getMonth() - 5 + i, 1);
    return {
      key: day(d).slice(0, 7),
      label: d.toLocaleDateString("en-US", { month: "short" }),
      Paid: 0,
      Outstanding: 0,
    };
  });
  const ids = new Set(cases.map((c) => c.id));
  const eligible = invoices.filter(
    (i) => i.status !== "Draft" && invoiceCaseIds(i).every((id) => ids.has(id)),
  );
  let paid = 0,
    outstanding = 0;
  for (const invoice of eligible) {
    const cents = invoiceTotals(invoice).total;
    const isPaid = invoice.status === "Paid";
    if (isPaid) paid += cents;
    else outstanding += cents;
    const bucket = months.find((x) => x.key === invoice.date?.slice(0, 7));
    if (bucket) bucket[isPaid ? "Paid" : "Outstanding"] += cents;
  }
  return {
    intake,
    intakeTotal: intake.reduce((n, x) => n + x.count, 0),
    distribution,
    services,
    months: months.map((m) => ({ ...m, Paid: m.Paid / 100, Outstanding: m.Outstanding / 100 })),
    paid: paid / 100,
    outstanding: outstanding / 100,
  };
}
