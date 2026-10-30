import { describe, expect, it } from "vitest";
import { buildSeed } from "@/lib/mock-data";
import { calendarItems, clientMetrics, filterClients, localIso, monthGrid } from "@/lib/client-calendar";

describe("Clients and calendar mock data", () => {
  const seed = buildSeed();
  it("finds clients by contact details and status", () => {
    const c = seed.clients[0];
    expect(filterClients(seed.clients, c.email, "Active").map((x) => x.id)).toEqual([c.id]);
    expect(filterClients(seed.clients, c.email, "Inactive")).toEqual([]);
  });
  it("counts open cases and only billed invoice fees for a client", () => {
    const c = seed.clients[0], base = seed.cases[0];
    const cases = [{ ...base, clientId: c.id, status: "Active" as const, invoiceStatus: "Sent" as const, fee: 100 }, { ...base, id: "x", clientId: c.id, status: "Completed" as const, invoiceStatus: "Not Invoiced" as const, fee: 50 }];
    expect(clientMetrics(c, cases)).toMatchObject({ total: 2, open: 1, billed: 100 });
  });
  it("shows services and events chronologically while excluding cancelled services", () => {
    const base = seed.cases[0];
    const items = calendarItems([{ ...base, id: "late", serviceDate: "2026-11-02", serviceTime: "10:00", status: "Active" }, { ...base, id: "cancelled", serviceDate: "2026-11-01", status: "Cancelled" }], [{ ...seed.events[0], id: "early", date: "2026-11-01", time: "09:00" }]);
    expect(items.map((i) => i.id)).toEqual(["early", "late"]);
  });
  it("builds a six-week month grid starting on Sunday", () => {
    const grid = monthGrid(2026, 9);
    expect(grid).toHaveLength(42);
    expect(localIso(grid[0])).toBe("2026-09-27");
  });
});