import { expect, it } from "vitest";
import { overviewCharts } from "../lib/overview-charts";
import type { Case, Invoice } from "../lib/domain";
const now = new Date(2026, 10, 27, 12);
const row = (
  id: string,
  status = "Pending",
  createdAt = "2026-11-27T12:00:00",
  serviceDate = "2026-11-26",
) => ({ id, status, createdAt, serviceDate }) as Case;
const invoice = (id: string, status: Invoice["status"], price: number, caseIds = ["a"]) =>
  ({
    id,
    caseId: caseIds[0],
    caseIds,
    status,
    date: "2026-11-15",
    lines: [{ qty: 1, price, description: "Service" }],
    taxRate: 0,
  }) as Invoice;
it("empty accounts contain no invented activity or billing", () => {
  const d = overviewCharts([], [], 28, now);
  expect(d.intake).toHaveLength(28);
  expect(d.intakeTotal).toBe(0);
  expect(d.distribution.every((x) => x.value === 0)).toBe(true);
  expect(d.months).toHaveLength(6);
  expect(d.paid + d.outstanding).toBe(0);
});
it("intake honors the selected calendar range and ignores invalid/future timestamps", () => {
  const d = overviewCharts(
    [
      row("a"),
      row("b", "Active", "2026-11-21T00:00:00"),
      row("old", "Pending", "2026-11-20T12:00:00"),
      row("future", "Pending", "2026-11-28T12:00:00"),
      row("bad", "Pending", ""),
    ],
    [],
    7,
    now,
  );
  expect(d.intake[0].date).toBe("2026-11-21");
  expect(d.intakeTotal).toBe(2);
  expect(d.intake.at(-1)?.count).toBe(1);
});
it("status groups reconcile with totals and service chart uses service dates", () => {
  const rows = [
    row("a", "Completed"),
    row("b", "Rescheduled"),
    row("c", "Cancelled"),
    row("d", "Scheduled", undefined, "2027-01-01"),
  ];
  const d = overviewCharts(rows, [], 28, now);
  expect(d.distribution.reduce((n, x) => n + x.value, 0)).toBe(4);
  expect(d.distribution.find((x) => x.name === "Other")?.value).toBe(2);
  expect(d.services.reduce((n, x) => n + x.Completed, 0)).toBe(1);
  expect(d.services.reduce((n, x) => n + x.Open, 0)).toBe(1);
});
it("billing excludes drafts and invoices with inaccessible grouped cases, counting each invoice once", () => {
  const d = overviewCharts(
    [row("a"), row("b")],
    [
      invoice("paid", "Paid", 19.99),
      invoice("group", "Sent", 30, ["a", "b"]),
      invoice("draft", "Draft", 100),
      invoice("private", "Overdue", 400, ["a", "stranger"]),
    ],
    28,
    now,
  );
  expect(d.paid).toBe(19.99);
  expect(d.outstanding).toBe(30);
  expect(d.months.at(-1)?.Paid).toBe(19.99);
  expect(d.months.at(-1)?.Outstanding).toBe(30);
});
