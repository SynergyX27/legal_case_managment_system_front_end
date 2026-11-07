import { describe, it, expect } from "vitest";
import { buildSeed } from "@/lib/mock-data";
import { buildReports, reportCsv } from "@/lib/reports";
import { canAccess } from "@/lib/store";
describe("Basic reports", () => {
  it("excludes invoices from cases outside the visible scope and excludes drafts from outstanding", () => {
    const s = buildSeed(),
      c = s.cases[0],
      base = {
        ...s.invoices[0],
        caseId: c.id,
        clientId: c.clientId,
        lines: [{ description: "Service", qty: 1, price: 100 }],
        taxRate: 10,
      };
    const r = buildReports(
      [c],
      [
        { ...base, status: "Paid" },
        { ...base, id: "sent", status: "Sent" },
        { ...base, id: "draft", status: "Draft" },
        { ...base, id: "hidden", caseId: "invisible", status: "Overdue" },
      ],
      s.users,
      s.clients,
    );
    expect(r.paid).toBe(110);
    expect(r.outstanding).toBe(110);
    expect(r.draft).toBe(110);
    expect(r.overdue).toBe(0);
    expect(r.staff.reduce((n, u) => n + u.total, 0)).toBe(1);
    expect(r.clients).toHaveLength(1);
  });
  it("handles empty workspaces and escapes exported customer names", () => {
    const r = buildReports([], [], [], []);
    expect(r.completionRate).toBe(0);
    expect(r.total).toBe(0);
    r.clients.push({
      id: "x",
      name: '=formula, "Name"',
      total: 1,
      completed: 0,
      paid: 0,
      outstanding: 0,
    });
    expect(reportCsv(r)).toContain("' =formula".replace(" ", ""));
    expect(reportCsv(r)).toContain('""Name""');
  });
  it("removes both retired sections for all roles and retains owner/manager reporting", () => {
    for (const role of ["owner", "manager", "staff", "customer"]) {
      expect(canAccess(role, "ai")).toBe(false);
      expect(canAccess(role, "automations")).toBe(false);
    }
    expect(canAccess("owner", "reports")).toBe(true);
    expect(canAccess("manager", "reports")).toBe(true);
    expect(canAccess("customer", "reports")).toBe(false);
  });
});
