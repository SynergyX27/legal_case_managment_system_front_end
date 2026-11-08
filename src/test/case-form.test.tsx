import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CaseForm } from "@/components/lf/case-form-dialog";
import { useStore } from "@/lib/store";
import type { User, Client, Case } from "@/lib/domain";

const owner: User = {
  id: "test-owner",
  name: "Owner",
  email: "owner@test.invalid",
  role: "owner",
  status: "Active",
  accountId: "company",
  lastLogin: "",
  title: "",
  online: false,
};
const customer: Client = {
  id: "test-client",
  name: "Customer",
  company: "Customer",
  email: "customer@test.invalid",
  phone: "",
  address: "",
  status: "Active",
  accountId: "company",
};
const addCase = vi.fn(async (_c: Case) => true);
beforeEach(() => {
  vi.stubGlobal("crypto", { randomUUID: () => "test-id" });
  useStore.setState({
    users: [
      owner,
      { ...owner, id: "manager", name: "Manager", role: "manager" },
      { ...owner, id: "staff", name: "Staff", role: "staff", managerId: "manager" },
    ],
    sessionUserId: owner.id,
    clients: [customer],
    cases: [],
    customFields: [],
    companyDocuments: [],
    addCase,
  });
  addCase.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("one case form in two presentations", () => {
  it("allows permitted staff and automatically selects their manager", async () => {
    const staff: User = {
      ...owner,
      id: "staff",
      role: "staff",
      managerId: "manager",
      permissions: { "cases.create": true },
    };
    useStore.setState({
      sessionUserId: staff.id,
      users: [staff, { ...owner, id: "manager", name: "Manager", role: "manager" }],
    });
    render(<CaseForm presentation="page" onCancel={() => {}} onSaved={() => {}} />);
    fireEvent.change(screen.getByLabelText("Case Number"), { target: { value: "STAFF-1" } });
    fireEvent.change(screen.getByLabelText("Tenant *"), { target: { value: "Tenant" } });
    expect(screen.getByLabelText("Assigned Manager (from staff team)")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Create case" }));
    await waitFor(() => expect(addCase).toHaveBeenCalledTimes(1));
    expect(addCase.mock.calls[0][0]).toMatchObject({
      staffId: "staff",
      managerId: "manager",
      clientId: "test-client",
    });
  });

  it.each(["modal", "page"] as const)(
    "%s saves the same fields and pending attachment",
    async (presentation) => {
      const saved = vi.fn();
      render(<CaseForm presentation={presentation} onCancel={() => {}} onSaved={saved} />);
      expect(screen.queryByRole("dialog") !== null).toBe(presentation === "modal");
      fireEvent.change(screen.getByLabelText("Case Number"), { target: { value: "REF-002" } });
      fireEvent.change(screen.getByLabelText("Tenant *"), { target: { value: "Tenant Name" } });
      fireEvent.change(screen.getByLabelText("REF"), { target: { value: "Client reference" } });
      fireEvent.change(screen.getByLabelText("County"), { target: { value: "Test County" } });
      const file = new File(["%PDF-1.7"], "notice.pdf", { type: "application/pdf" });
      const fileInput = document.querySelector('input[type="file"]')!;
      fireEvent.change(fileInput, { target: { files: [file] } });
      await screen.findByText("notice.pdf");
      fireEvent.click(screen.getByRole("button", { name: "Create case" }));
      await waitFor(() => expect(saved).toHaveBeenCalled());
      expect(addCase).toHaveBeenCalledTimes(1);
      expect(addCase.mock.calls[0][0]).toMatchObject({
        number: "REF-002",
        residentName: "Tenant Name",
        ref: "Client reference",
        county: "Test County",
        clientId: "test-client",
        attachments: [{ name: "notice.pdf", pendingFile: file }],
      });
    },
  );
  it("keeps the form and values open when saving fails", async () => {
    useStore.setState({ addCase: vi.fn(async () => false) });
    const saved = vi.fn();
    render(<CaseForm presentation="page" onCancel={() => {}} onSaved={saved} />);
    fireEvent.change(screen.getByLabelText("Case Number"), { target: { value: "RETRY-1" } });
    fireEvent.change(screen.getByLabelText("Tenant *"), { target: { value: "Tenant" } });
    fireEvent.click(screen.getByRole("button", { name: "Create case" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Create case" })).not.toBeDisabled(),
    );
    expect(saved).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Case Number")).toHaveValue("RETRY-1");
  });
  it("does not save when required fields are missing", () => {
    render(<CaseForm presentation="page" onCancel={() => {}} onSaved={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Create case" }));
    expect(addCase).not.toHaveBeenCalled();
  });
  it("cancel returns to the caller without saving", () => {
    const cancel = vi.fn();
    render(<CaseForm presentation="page" onCancel={cancel} onSaved={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(addCase).not.toHaveBeenCalled();
  });
  it.each(["customer", "staff"] as const)("denies direct page creation to %s", (role) => {
    useStore.setState({ users: [{ ...owner, role }] });
    render(<CaseForm presentation="page" onCancel={() => {}} onSaved={() => {}} />);
    expect(screen.queryByRole("button", { name: "Create case" })).not.toBeInTheDocument();
  });
});
