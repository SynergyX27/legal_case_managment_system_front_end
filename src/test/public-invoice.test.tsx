import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (config: any) => config }));
import { PublicInvoice } from "@/routes/pay.invoice";
const fixture = () => ({
  invoice: {
    number: "DEMO-INVOICE-1",
    date: "2026-11-26",
    dueDate: "2026-12-26",
    status: "Sent",
    template: "T2B",
    taxRate: 0,
    lines: [
      {
        description: "Apartment setout service",
        qty: 1,
        price: 650,
        caseNumber: "CASE-1",
        tenant: "Demo Tenant",
        unit: "101",
        serviceDate: "2026-12-15",
      },
    ],
    totals: { base: 65000, discount: 10000, net: 55000, tax: 0, total: 55000 },
  },
  company: {
    name: "Demo Services",
    address: "Example address",
    email: "billing@example.invalid",
    phone: "",
    hasLogo: false,
  },
  customer: {
    name: "Demo Customer",
    company: "Demo Holdings",
    address: "Example Road",
    email: "customer@example.invalid",
    phone: "",
  },
  payment: { enabled: true, testMode: false },
});
let data: ReturnType<typeof fixture>;
beforeEach(() => {
  data = fixture();
  window.history.replaceState({}, "", "/pay/invoice#token=" + "a".repeat(43));
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (path: string) =>
        new Response(
          JSON.stringify(path.endsWith("status") ? { status: data.invoice.status } : data),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});
it("opens an invoice without cookies or auth calls and shows payment, print and PDF actions", async () => {
  render(<PublicInvoice />);
  expect(await screen.findByRole("button", { name: "Pay invoice" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Print invoice" })).toBeInTheDocument();
  expect(screen.getByText("Demo Customer")).toBeInTheDocument();
  for (const [path, options] of vi.mocked(fetch).mock.calls) {
    expect(String(path)).toContain("/api/public/invoices/");
    expect(options?.credentials).toBe("omit");
    expect(JSON.parse(options?.body as string)).toEqual({ token: "a".repeat(43) });
  }
});
it("shows paid state and removes payment action after server confirms payment", async () => {
  render(<PublicInvoice />);
  await screen.findByRole("button", { name: "Pay invoice" });
  data.invoice.status = "Paid";
  fireEvent.click(screen.getByRole("button", { name: "Refresh payment status" }));
  expect(await screen.findByText("Paid in full")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Pay invoice" })).not.toBeInTheDocument();
  expect(screen.getAllByText("$0.00").length).toBeGreaterThan(0);
});
it("does not mark an invoice paid from the return URL alone", async () => {
  window.history.replaceState({}, "", "/pay/invoice?payment=success#token=" + "a".repeat(43));
  render(<PublicInvoice />);
  await screen.findByRole("button", { name: "Pay invoice" });
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("being confirmed"));
  expect(screen.queryByText("Paid in full")).not.toBeInTheDocument();
});
it("shows a helpful unavailable state for expired or revoked links", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ error: "This invoice link is unavailable or has expired." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }),
  );
  render(<PublicInvoice />);
  expect(await screen.findByRole("alert")).toHaveTextContent("expired");
  expect(screen.queryByRole("button", { name: "Pay invoice" })).not.toBeInTheDocument();
});
