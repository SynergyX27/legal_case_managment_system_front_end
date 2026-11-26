import type { Invoice } from "./domain";
import { invoiceAllocations, invoiceCaseIds, invoiceTotals } from "./invoice-math";
export const totalFor = (i: Invoice) => invoiceTotals(i).total / 100;
export const caseInvoiceTotal = (i: Invoice, id: string) => (invoiceAllocations(i)[id] || 0) / 100;
export function caseBilling(invoices: Invoice[], caseId: string) {
  const related = invoices.filter((i) => invoiceCaseIds(i).includes(caseId));
  const issued = related.filter((i) => i.status !== "Draft");
  const paid = issued.filter((i) => i.status === "Paid");
  const latest = [...paid].sort((a, b) =>
    (b.paidAt ?? b.date).localeCompare(a.paidAt ?? a.date),
  )[0];
  return {
    count: related.length,
    balance: issued
      .filter((i) => i.status !== "Paid")
      .reduce((s, i) => s + caseInvoiceTotal(i, caseId), 0),
    lastPayment: latest ? caseInvoiceTotal(latest, caseId) : 0,
    lastPaymentDate: latest?.paidAt ?? latest?.date ?? "",
    totalPaid: paid.reduce((s, i) => s + caseInvoiceTotal(i, caseId), 0),
    invoiceStatus: !related.length
      ? "Not Invoiced"
      : issued.some((i) => i.status === "Overdue")
        ? "Overdue"
        : issued.some((i) => i.status === "Sent")
          ? "Sent"
          : issued.length
            ? "Paid"
            : "Draft",
    paymentStatus:
      !issued.length || !paid.length
        ? "Unpaid"
        : paid.length === issued.length
          ? "Paid"
          : "Partial",
  };
}
