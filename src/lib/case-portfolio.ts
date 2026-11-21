import type { Case } from "./domain";
export const portfolioKeys = [
  "community",
  "neighborhood",
  "plaintiff",
  "county",
  "city",
  "state",
] as const;
export const portfolioLabels = {
  community: "Apartment community",
  neighborhood: "Neighborhood",
  plaintiff: "Plaintiff",
  county: "County",
  city: "City",
  state: "State",
};
export const defaultStatusTiles = [
  "All cases",
  "Active",
  "Scheduled",
  "Completed",
  "Rescheduled",
  "Skipped",
  "Vacated",
  "Cancelled",
];
export function caseAmounts(c: Pick<Case, "moneyOwed" | "paidInvoiceTotal" | "status">) {
  const original = Math.max(0, Math.round((c.moneyOwed || 0) * 100));
  const paid = Math.max(0, Math.round((c.paidInvoiceTotal || 0) * 100));
  const cleared = c.status === "Completed" ? original : Math.min(original, paid);
  return { original: original / 100, cleared: cleared / 100, due: (original - cleared) / 100 };
}
export function caseMoney(cases: Case[]) {
  return cases.reduce(
    (totals, c) => {
      const balance = caseAmounts(c);
      return {
        owed: Math.round((totals.owed + balance.original) * 100) / 100,
        cleared: Math.round((totals.cleared + balance.cleared) * 100) / 100,
        due: Math.round((totals.due + balance.due) * 100) / 100,
      };
    },
    { owed: 0, cleared: 0, due: 0 },
  );
}
export const escapeHtml = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
export function printCaseReport(cases: Case[], title: string, statuses: string[]) {
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("Allow popups to print or save this report as PDF.");
  const totals = caseMoney(cases);
  const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const headers = [
    "Case number",
    "Community",
    "Neighborhood",
    "Plaintiff",
    "Tenant",
    "Address",
    "County",
    "City",
    "State",
    "Status",
    "Original balance",
    "Amount cleared",
    "Balance owed",
  ];
  popup.opener = null;
  popup.document.write(
    `<!doctype html><html><head><title>Case files report</title><style>body{font:12px Arial,sans-serif;color:#1b2c45;margin:24px}h1{font-size:24px}table{border-collapse:collapse;width:100%;font-size:10px}th,td{border:1px solid #ccd3dc;padding:6px;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}.totals{display:flex;gap:30px;margin:20px 0}.owed{color:#b42318}.cleared{color:#067647}.due{color:#a15c00}@page{size:landscape;margin:12mm}@media print{button{display:none}}</style></head><body><button id="print-report">Print / Save as PDF</button><h1>Case files report</h1><p>${escapeHtml(title)}</p><p>${cases.length} cases · ${escapeHtml(new Date().toLocaleString())}</p><p>${statuses.map((v) => escapeHtml(v) + ": " + (v === "All cases" ? cases.length : cases.filter((c) => c.status === v).length)).join(" · ")}</p><div class="totals"><p class="owed">Amount owed <strong>${money(totals.owed)}</strong></p><p class="cleared">Amount cleared <strong>${money(totals.cleared)}</strong></p><p class="due">Amount due <strong>${money(totals.due)}</strong></p></div><table><thead><tr>${headers.map((v) => "<th>" + v + "</th>").join("")}</tr></thead><tbody>${cases.map((c) => "<tr>" + [c.number, c.community, c.neighborhood, c.plaintiff, c.residentName, c.residentAddress, c.county, c.city, c.state, c.status, money(c.moneyOwed || 0), money(caseAmounts(c).cleared), money(caseAmounts(c).due)].map((v) => "<td>" + escapeHtml(v) + "</td>").join("") + "</tr>").join("")}</tbody></table></body></html>`,
  );
  popup.document.close();
  popup.document.getElementById("print-report")?.addEventListener("click", () => popup.print());
  popup.focus();
}
