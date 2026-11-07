import type { Client, Invoice } from "./domain";
import { invoiceTotal } from "./store";

export function filterInvoices(
  invoices: Invoice[],
  clients: Client[],
  query: string,
  status: string,
  clientId: string,
) {
  const q = query.trim().toLowerCase();
  return invoices.filter((i) => {
    const c = clients.find((c) => c.id === i.clientId);
    return (
      (!status || i.status === status) &&
      (!clientId || i.clientId === clientId) &&
      (!q ||
        [i.number, c?.name, c?.company, ...i.lines.map((l) => l.description)]
          .join(" ")
          .toLowerCase()
          .includes(q))
    );
  });
}
export function invoiceSummary(invoices: Invoice[]) {
  const sum = (status: string[]) =>
    invoices
      .filter((i) => status.includes(i.status))
      .reduce((n, i) => n + invoiceTotal(i).total, 0);
  return {
    paid: sum(["Paid"]),
    outstanding: sum(["Sent", "Overdue"]),
    overdue: sum(["Overdue"]),
    draft: sum(["Draft"]),
  };
}
export function validateInvoice(i: Invoice, invoices: Invoice[]) {
  if (!i.number.trim() || !i.caseId || !i.clientId || !i.date || !i.dueDate)
    return "Invoice number, case and dates are required";
  if (
    invoices.some(
      (x) => x.id !== i.id && x.number.trim().toLowerCase() === i.number.trim().toLowerCase(),
    )
  )
    return "Invoice number already exists";
  if (i.dueDate < i.date) return "Due date cannot be before the invoice date";
  if (
    !i.lines.length ||
    i.lines.some(
      (l) =>
        !l.description.trim() ||
        !Number.isFinite(l.qty) ||
        l.qty <= 0 ||
        !Number.isFinite(l.price) ||
        l.price < 0,
    )
  )
    return "Each line needs a description, positive quantity and non-negative price";
  if (!Number.isFinite(i.taxRate) || i.taxRate < 0 || i.taxRate > 100)
    return "Tax rate must be between 0 and 100";
  return "";
}
