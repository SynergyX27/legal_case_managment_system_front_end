import { describe, expect, it } from "vitest";
import { buildSeed } from "@/lib/mock-data";
import { defaultViews, useStore } from "@/lib/store";
import { caseCsv, filterCases, sortCases, summarizeCases } from "@/lib/case-management";

describe("Local mock case management", () => {
  const seed = buildSeed();
  const base = defaultViews()[0].filters;
  it("finds a case by case number and combines status filters", () => {
    const c = seed.cases[0];
    expect(filterCases(seed.cases, { ...base, search: c.number, status: [c.status] }, seed.clients, seed.users).map((x) => x.id)).toEqual([c.id]);
    expect(filterCases(seed.cases, { ...base, search: c.number, status: [c.status === "Active" ? "Pending" : "Active"] }, seed.clients, seed.users)).toEqual([]);
  });
  it("includes both endpoints of a service date range", () => {
    const c = seed.cases[0];
    expect(filterCases([c], { ...base, dateFrom: c.serviceDate, dateTo: c.serviceDate }, seed.clients, seed.users)).toHaveLength(1);
    expect(filterCases([c], { ...base, dateFrom: "9999-12-31" }, seed.clients, seed.users)).toHaveLength(0);
  });
  it("sorts fees numerically without mutating source records", () => {
    const cases = [{ ...seed.cases[0], fee: 300 }, { ...seed.cases[1], fee: 85 }];
    expect(sortCases(cases, "fee", false, seed.clients, seed.users).map((c) => c.fee)).toEqual([85, 300]);
    expect(cases.map((c) => c.fee)).toEqual([300, 85]);
  });
  it("summarizes open services without counting completed or cancelled work as overdue", () => {
    const c = seed.cases[0];
    const cases = [{ ...c, status: "Active" as const, serviceDate: "2026-10-29" }, { ...c, status: "Pending" as const, serviceDate: "2026-10-30" }, { ...c, status: "Completed" as const, serviceDate: "2026-10-28" }, { ...c, status: "Cancelled" as const, serviceDate: "2026-10-28" }];
    expect(summarizeCases(cases, "2026-10-30")).toEqual({ total: 4, active: 1, pending: 1, completed: 1, today: 1, overdue: 1 });
  });
  it("exports filtered mock records with quoted CSV fields", () => {
    const csv = caseCsv([{ ...seed.cases[0], title: 'Resident, "Smith"' }], seed.clients, seed.users);
    expect(csv).toContain('"Resident, ""Smith"""');
    expect(csv.split("\r\n")).toHaveLength(2);
  });
  it("creates, updates and deletes cases using only the local mock store", () => {
    const c = { ...seed.cases[0], id: "test-local-case" };
    useStore.getState().addCase(c);
    useStore.getState().updateCase(c.id, { residentName: "Local prototype resident" });
    expect(useStore.getState().cases.find((x) => x.id === c.id)?.residentName).toBe("Local prototype resident");
    useStore.getState().deleteCase(c.id);
    expect(useStore.getState().cases.some((x) => x.id === c.id)).toBe(false);
  });
});