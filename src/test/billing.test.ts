import { describe, it, expect } from "vitest";
import { caseBilling, totalFor } from "@/lib/billing";
import { buildReports } from "@/lib/reports";
import type { Invoice, Case } from "@/lib/domain";
const invoice = (patch: Partial<Invoice>): Invoice => ({
  id: "test",
  number: "INV-1",
  caseId: "case-1",
  clientId: "client-1",
  date: "2026-11-01",
  dueDate: "2026-12-01",
  lines: [{ description: "Service", qty: 1, price: 100 }],
  taxRate: 10,
  status: "Sent",
  ...patch,
});
describe("billing across many invoices", () => {
  it("excludes drafts, totals only the case and identifies the latest recorded payment", () => {
    const rows = [
      invoice({ id: "paid", status: "Paid", paidAt: "2026-11-03" }),
      invoice({ id: "due" }),
      invoice({ id: "draft", status: "Draft" }),
      invoice({ id: "other", caseId: "another" }),
    ];
    const result = caseBilling(rows, "case-1");
    expect(result.count).toBe(3);
    expect(result.balance).toBe(110);
    expect(result.totalPaid).toBe(110);
    expect(result.lastPaymentDate).toBe("2026-11-03");
    expect(result.paymentStatus).toBe("Partial");
  });
  it("rounds invoice totals to cents", () => {
    expect(
      totalFor(invoice({ lines: [{ description: "Service", qty: 3, price: 0.1 }], taxRate: 0 })),
    ).toBe(0.3);
  });
  it("reports do not incorporate invoices from outside the visible cases", () => {
    const report = buildReports(
      [{ id: "case-1", status: "Active", clientId: "client-1", staffId: "" } as Case],
      [
        invoice({}),
        invoice({ caseId: "private-case", lines: [{ description: "Other", qty: 1, price: 9999 }] }),
      ],
      [],
      [],
    );
    expect(report.total).toBe(1);
    expect(report.outstanding).toBe(110);
  });
});
