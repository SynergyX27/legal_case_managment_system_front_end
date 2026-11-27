import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
vi.mock("@/lib/api", () => ({ api: vi.fn() }));
vi.mock("@/lib/file-upload-queue", () => ({
  pendingUploads: async () => [],
  subscribeUploads: () => () => {},
  enqueueFiles: vi.fn(),
  retryUploads: vi.fn(),
  discardUpload: vi.fn(),
}));
import { FileManager } from "@/components/lf/file-manager";
const file = {
  id: "file-a",
  name: "Writ.pdf",
  type: "pdf",
  approval: "pending",
  updatedAt: "2026-11-27T00:00:00.000Z",
  url: "/api/documents/file-a/content",
  size: "2 KB",
  collectionId: "writ",
};
function setup(role: string) {
  useStore.setState({
    sessionUserId: "me",
    users: [{ id: "me", name: "Me", role, status: "Active" }] as any,
    refresh: vi.fn(async () => {}),
  });
  vi.mocked(api).mockImplementation(async (path) =>
    path.includes("/folders")
      ? {
          folders: [
            { id: "case-a", number: "LF-001", tenant: "John", address: "100 Main St", files: 1 },
          ],
          hasMore: false,
        }
      : path.includes("/collections")
        ? {
            case: { id: "case-a", number: "LF-001", tenant: "John" },
            collections: [
              { id: "writ", name: "Writ", section: "docs", files: 1, pending: 1 },
              { id: "vis-to", name: "VIS - TO", section: "visuals", files: 0, pending: 0 },
            ],
          }
        : path.includes("/files?")
          ? { files: [file], hasMore: false }
          : { ok: true },
  );
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("opens a searchable case folder, shows DOCS and VISUALS, and approves selected files", async () => {
  setup("manager");
  render(<FileManager />);
  fireEvent.click(await screen.findByRole("button", { name: /LF-001/ }));
  expect(await screen.findByText("DOCS")).toBeInTheDocument();
  expect(screen.getByText("VISUALS")).toBeInTheDocument();
  fireEvent.click(await screen.findByRole("button", { name: /Writ/ }));
  fireEvent.click(await screen.findByRole("checkbox", { name: "Select Writ.pdf" }));
  fireEvent.click(screen.getByRole("button", { name: "Approve selected" }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith("/file-manager/files", {
      method: "PATCH",
      body: { files: [{ id: "file-a", updatedAt: file.updatedAt }], action: "approve" },
    }),
  );
});
it("customers have no upload or review controls", async () => {
  setup("customer");
  vi.mocked(api).mockImplementation(async (path) =>
    path.includes("/collections")
      ? {
          case: { number: "LF-001" },
          collections: [{ id: "writ", name: "Writ", section: "docs", files: 1 }],
        }
      : { files: [{ ...file, approval: "approved" }], hasMore: false },
  );
  render(<FileManager caseId="case-a" initialCollection="writ" />);
  await screen.findByText("Writ.pdf");
  expect(screen.queryByRole("button", { name: "Upload files" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Approve selected" })).not.toBeInTheDocument();
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
});
