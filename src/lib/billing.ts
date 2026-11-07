import type { Invoice } from "./domain";
export const totalFor = (i: Invoice) =>
  Math.round(i.lines.reduce((sum, l) => sum + l.qty * l.price, 0) * (1 + i.taxRate / 100) * 100) /
  100;
export function caseBilling(invoices: Invoice[], caseId: string) {
  const related = invoices.filter((i) => i.caseId === caseId);
  const issued = related.filter((i) => i.status !== "Draft");
  const paid = issued.filter((i) => i.status === "Paid");
  const latest = [...paid].sort((a, b) =>
    (b.paidAt ?? b.date).localeCompare(a.paidAt ?? a.date),
  )[0];
  return {
    count: related.length,
    balance: issued.filter((i) => i.status !== "Paid").reduce((s, i) => s + totalFor(i), 0),
    lastPayment: latest ? totalFor(latest) : 0,
    lastPaymentDate: latest?.paidAt ?? latest?.date ?? "",
    totalPaid: paid.reduce((s, i) => s + totalFor(i), 0),
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
