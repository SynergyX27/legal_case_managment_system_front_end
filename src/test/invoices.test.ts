import { describe, expect, it } from "vitest";
import { buildSeed } from "@/lib/mock-data";
import { filterInvoices, invoiceSummary, nextInvoiceNumber, validateInvoice } from "@/lib/invoices";
import { invoiceTotal, useStore } from "@/lib/store";

describe("Local invoice management", () => {
  const seed = buildSeed();
  const base = { ...seed.invoices[0], date: "2026-10-30", dueDate: "2026-11-30", taxRate: 8, lines: [{ description: "Service", qty: 2, price: 100 }] };
  it("calculates concrete line quantities and percentage tax", () => { expect(invoiceTotal(base)).toEqual({ sub: 200, tax: 16, total: 216 }); });
  it("separates paid, outstanding, overdue and draft balances", () => { expect(invoiceSummary([ { ...base, status: "Paid" }, { ...base, status: "Sent" }, { ...base, status: "Overdue" }, { ...base, status: "Draft" } ])).toEqual({ paid: 216, outstanding: 432, overdue: 216, draft: 216 }); });
  it("filters invoice numbers and statuses together", () => { expect(filterInvoices([base], seed.clients, base.number, "Paid", "")).toHaveLength(base.status === "Paid" ? 1 : 0); expect(filterInvoices([base], seed.clients, base.number, "", base.clientId)).toHaveLength(1); });
  it("rejects invalid lines and dates", () => { expect(validateInvoice({ ...base, lines: [] }, [])).not.toBe(""); expect(validateInvoice({ ...base, dueDate: "2026-10-29" }, [])).not.toBe(""); expect(validateInvoice(base, [])).toBe(""); });
  it("does not reuse invoice numbers or allow duplicates", () => { expect(nextInvoiceNumber([{ ...base, number: "INV-3210" }])).toBe("INV-3211"); expect(validateInvoice({ ...base, id: "new" }, [base])).toBe("Invoice number already exists"); });
  it("synchronizes case payment state with local invoice status", () => { useStore.getState().upsertInvoice({ ...base, status: "Paid" }); expect(useStore.getState().cases.find((c) => c.id === base.caseId)?.paymentStatus).toBe("Paid"); useStore.getState().upsertInvoice({ ...base, status: "Sent" }); expect(useStore.getState().cases.find((c) => c.id === base.caseId)?.paymentStatus).toBe("Unpaid"); });
});