import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CasesTable } from "@/components/lf/cases-table";
import { useStore, defaultViews, canAccess } from "@/lib/store";
import type { Case, User } from "@/lib/domain";
vi.mock("@tanstack/react-router", async () => ({
  ...(await vi.importActual("@tanstack/react-router")),
  useNavigate: () => vi.fn(),
}));
const owner = {
  id: "owner",
  name: "Owner",
  email: "owner@example.invalid",
  role: "owner",
  status: "Active",
  accountId: "company",
} as User;
const cases = [
  {
    id: "case-a",
    number: "A-001",
    community: "Southland Hills",
    status: "Active",
    moneyOwed: 1250,
  },
  {
    id: "case-b",
    number: "A-002",
    community: "Southland Hills",
    status: "Completed",
    moneyOwed: 500,
  },
  {
    id: "case-c",
    number: "A-003",
    community: "Westbrook Station",
    status: "Pending",
    moneyOwed: 900,
  },
].map((c) => ({
  ...c,
  description: "", residentPhone: "", notes: "", serviceLocation: "", instructions: "", fee: 0, invoiceStatus: "Not Invoiced", paymentStatus: "Unpaid", court: "", jurisdiction: "",
  title: "Property case",
  clientId: "client",
  staffId: "staff",
  managerId: "manager",
  type: "Eviction Notice",
  priority: "Medium",
  residentName: "Tenant",
  residentAddress: "Address",
  serviceDate: "2026-11-22",
  serviceTime: "10:00",
  attachments: [],
  comments: [],
  custom: {},
  createdAt: "2026-11-21T00:00:00Z",
  updatedAt: "2026-11-21T00:00:00Z",
})) as Case[];
beforeEach(() => {
  useStore.setState({
    sessionUserId: "owner",
    users: [owner],
    clients: [],
    cases,
    invoices: [],
    customFields: [],
    tablePrefs: null,
    savedViews: [
      ...defaultViews(),
      {
        id: "southland",
        name: "Southland Hills only",
        filters: { ...defaultViews()[0].filters, community: "Southland Hills" },
      },
    ],
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("restores saved community filters for rows, status tiles and case balances", () => {
  render(<CasesTable />);
  fireEvent.change(screen.getByLabelText("Saved view"), { target: { value: "southland" } });
  expect(screen.queryByText("A-003")).not.toBeInTheDocument();
  expect(screen.getByText("A-001")).toBeInTheDocument();
  expect(screen.getByRole("meter", { name: "Amount owed" })).toHaveAttribute(
    "aria-valuenow",
    "1750",
  );
  expect(screen.getByRole("meter", { name: "Amount cleared" })).toHaveAttribute(
    "aria-valuenow",
    "500",
  );
  expect(screen.getByRole("meter", { name: "Amount due" })).toHaveAttribute(
    "aria-valuenow",
    "1250",
  );
  expect(screen.getByRole("button", { name: "All cases 2" })).toBeInTheDocument();
});
it("prints the current filtered rows and escapes case content", () => {
  const write = vi.fn();
  const popup = {
    document: { write, close: vi.fn(), getElementById: () => ({ addEventListener: vi.fn() }) },
    focus: vi.fn(),
    opener: null,
  };
  vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
  render(<CasesTable />);
  fireEvent.change(screen.getByLabelText("Saved view"), { target: { value: "southland" } });
  fireEvent.click(screen.getByRole("button", { name: "Print / PDF" }));
  expect(write.mock.calls[0][0]).toContain("A-001");
  expect(write.mock.calls[0][0]).not.toContain("A-003");
});
it("makes scoped reporting available to customers while case import stays permission controlled", () => {
  useStore.setState({ users: [{ ...owner, role: "customer", clientId: "client" }] });
  render(<CasesTable />);
  expect(canAccess("customer", "reports")).toBe(true);
  expect(screen.queryByRole("button", { name: "Import cases" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Email report" })).toBeInTheDocument();
});
