import { afterEach, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { CompanyFileManager } from "@/components/lf/company-file-manager";
vi.mock("@/lib/api", () => ({ api: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("keeps legacy uploads in Unfiled and uploads into the opened company folder", async () => {
  useStore.setState({
    sessionUserId: "me",
    users: [{ id: "me", name: "Owner", role: "owner", status: "Active" }] as any,
    refresh: vi.fn(async () => {}),
  });
  vi.mocked(api).mockImplementation(async (path) =>
    path.startsWith("/company-folders")
      ? {
          folders: [
            { id: "policies", name: "Policies", files: 0, updatedAt: "2026-11-27T00:00:00.000Z" },
          ],
          unfiled: 3,
          hasMore: false,
        }
      : path.startsWith("/company-files?")
        ? { folder: { id: "policies", name: "Policies" }, files: [], hasMore: false }
        : { ok: true },
  );
  render(<CompanyFileManager />);
  expect(await screen.findByText(/3 files · existing uploads/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Policies/ }));
  await screen.findByText("This folder is empty. Upload files to get started.");
  fireEvent.change(screen.getByLabelText("Upload company files"), {
    target: { files: [new File(["hello"], "policy.txt", { type: "text/plain" })] },
  });
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      "/company-files",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
    ),
  );
  const call = vi
    .mocked(api)
    .mock.calls.find(([path, options]) => path === "/company-files" && options?.method === "POST")!;
  const body = call[1]!.body as FormData;
  expect(body.get("companyFolderId")).toBe("policies");
  expect(body.get("caseId")).toBeNull();
});
it("does not load the company library for a customer", () => {
  useStore.setState({
    sessionUserId: "customer",
    users: [{ id: "customer", role: "customer" }] as any,
  });
  render(<CompanyFileManager />);
  expect(screen.getByText("Company file access required")).toBeInTheDocument();
  expect(api).not.toHaveBeenCalled();
});
