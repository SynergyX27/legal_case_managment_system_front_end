import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: request }));
import { EmailSettings } from "@/components/lf/email-settings";
const status = {
  enabled: true,
  from: "delivery@test.invalid",
  counts: { pending: 1, sending: 0, sent: 5, failed: 2 },
  lastError: "EAUTH (535)",
};
beforeEach(() => {
  request.mockReset();
  request.mockImplementation(async (path: string) =>
    path === "/email/status" ? status : { ok: true, count: 2 },
  );
});
afterEach(cleanup);
describe("owner email diagnostics", () => {
  it("shows queue state and verifies SMTP without sending a test email", async () => {
    render(<EmailSettings />);
    expect(await screen.findByText("Sending enabled")).toBeInTheDocument();
    expect(screen.getByText("SMTP accepted")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check SMTP connection" }));
    await waitFor(() => expect(request).toHaveBeenCalledWith("/email/verify", { method: "POST" }));
  });
  it("retries failed messages through the authenticated API", async () => {
    render(<EmailSettings />);
    await screen.findByText("Sending enabled");
    fireEvent.click(screen.getByRole("button", { name: "Retry failed emails" }));
    await waitFor(() => expect(request).toHaveBeenCalledWith("/email/retry", { method: "POST" }));
  });
  it("does not offer SMTP checks while disabled", async () => {
    request.mockResolvedValue({ ...status, enabled: false });
    render(<EmailSettings />);
    await screen.findByText("Sending disabled");
    expect(screen.getByRole("button", { name: "Check SMTP connection" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Retry failed emails" })).toBeDisabled();
  });
});
