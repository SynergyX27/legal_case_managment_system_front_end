import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { InvoiceCasePicker } from "@/components/lf/invoice-case-picker";
const mock = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: mock.api }));
afterEach(() => {
  cleanup();
  mock.api.mockReset();
});
const row = (id: string, billed = false) => ({
  id,
  number: `CASE-${id}`,
  refId: `GA26-${id}`,
  residentName: `Tenant ${id}`,
  residentAddress: "Example Street",
  unit: id,
  propertyType: "APT",
  clientId: "customer",
  workspaceId: "community",
  serviceDate: "2026-12-15",
  status: "Scheduled",
  invoiceStatuses: billed ? ["Paid"] : [],
});
describe("invoice case picker", () => {
  it("retains selections across server pages and requires acknowledgement of existing invoices", async () => {
    mock.api.mockImplementation((path: string) => {
      const p = new URL(path, "http://test").searchParams;
      return Promise.resolve({
        rows: [p.get("page") === "2" ? row("b") : row("a", true)],
        total: 26,
      });
    });
    const choose = vi.fn();
    render(
      <InvoiceCasePicker
        initial={{ clientId: "customer", workspaceId: "community", serviceDate: "2026-12-15" }}
        onChoose={choose}
      />,
    );
    fireEvent.click(await screen.findByLabelText("Select CASE-a"));
    expect(screen.getByRole("button", { name: "Continue with 1 case" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(await screen.findByLabelText("Select CASE-b"));
    expect(screen.getByText("2 cases selected")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/I checked the existing invoices/));
    fireEvent.click(screen.getByRole("button", { name: "Continue with 2 cases" }));
    expect(choose.mock.calls[0][0].map((x: any) => x.id)).toEqual(["a", "b"]);
    expect(
      mock.api.mock.calls.some(([path]) => path.includes("page=2") && path.includes("limit=25")),
    ).toBe(true);
  });
  it("refuses select-all when over 100 cases match instead of silently truncating", async () => {
    mock.api.mockResolvedValue({ rows: [row("a")], total: 10025 });
    const choose = vi.fn();
    render(
      <InvoiceCasePicker
        initial={{ clientId: "customer", workspaceId: "community", serviceDate: "2026-12-15" }}
        onChoose={choose}
      />,
    );
    await screen.findByLabelText("Select CASE-a");
    fireEvent.click(screen.getByRole("button", { name: "Select all matching" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("More than 100 cases match");
    expect(choose).not.toHaveBeenCalled();
  });
  it("applies search on the server and clears it when changing filter stages", async () => {
    mock.api.mockResolvedValue({ rows: [row("a")], total: 1 });
    render(
      <InvoiceCasePicker
        initial={{ clientId: "customer", workspaceId: "community", serviceDate: "2026-12-15" }}
        onChoose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Tenant a" } });
    await waitFor(() =>
      expect(mock.api).toHaveBeenCalledWith(expect.stringContaining("q=Tenant+a")),
    );
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});
