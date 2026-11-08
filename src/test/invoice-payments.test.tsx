import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: request, resetCsrf: vi.fn() }));
vi.mock("@tanstack/react-router", async (original) => {
  const actual = await original<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useSearch: () => ({}),
    Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  };
});
import { Route } from "@/routes/_authenticated/invoices";
import { useStore } from "@/lib/store";
import type { Case, Client, Invoice, User } from "@/lib/domain";
const Page = Route.options.component as ComponentType;
const customer: User = {
  id: "customer",
  name: "Customer",
  email: "customer@test.invalid",
  role: "customer",
  status: "Active",
  accountId: "company",
  clientId: "client",
  lastLogin: "",
  title: "",
  online: false,
};
const invoice: Invoice = {
  id: "invoice-1",
  number: "INV-000001",
  caseId: "case-1",
  clientId: "client",
  date: "2026-11-08",
  dueDate: "2026-12-08",
  lines: [{ description: "Service", qty: 1, price: 100 }],
  taxRate: 0,
  status: "Sent",
};
beforeEach(() => {
  useStore.setState({
    users: [customer],
    sessionUserId: customer.id,
    clients: [{ id: "client", name: "Customer", company: "Customer" } as Client],
    cases: [{ id: "case-1", number: "CASE-1", clientId: "client" } as Case],
    invoices: [invoice],
    refresh: vi.fn(async () => {}),
  });
  request.mockReset();
  request.mockImplementation(async (path: string) =>
    path === "/payments/config" ? { enabled: true, testMode: true } : { paid: true },
  );
});
afterEach(cleanup);
describe("customer invoice payments", () => {
  it("opens checkout through the authenticated server endpoint without sending an amount", async () => {
    render(<Page />);
    const button = await screen.findByRole("button", { name: "Pay online" });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith("/invoices/invoice-1/checkout", { method: "POST" }),
    );
    expect(screen.getByText(/No real money will be charged/)).toBeInTheDocument();
  });
  it("disables payment until the backend webhook configuration is ready", async () => {
    request.mockResolvedValue({ enabled: false, testMode: true });
    render(<Page />);
    expect(await screen.findByText(/Online payments are not enabled yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay online" })).toBeDisabled();
  });
  it("does not offer payment again for an invoice already paid through Stripe", () => {
    useStore.setState({ invoices: [{ ...invoice, status: "Paid", paymentMethod: "stripe" }] });
    render(<Page />);
    expect(screen.queryByRole("button", { name: "Pay online" })).not.toBeInTheDocument();
    expect(screen.getByText("Paid online · Stripe")).toBeInTheDocument();
  });
  it("does not offer customer checkout to an owner", () => {
    useStore.setState({ users: [{ ...customer, role: "owner" }] });
    render(<Page />);
    expect(screen.queryByRole("button", { name: "Pay online" })).not.toBeInTheDocument();
  });
});
