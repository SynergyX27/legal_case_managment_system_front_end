import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: request }));
import { PaymentMode } from "@/components/lf/payment-mode";
beforeEach(() => {
  request.mockReset();
  request.mockResolvedValue({ enabled: true, testMode: true });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("highlights sandbox mode across the app", async () => {
  render(<PaymentMode />);
  expect(await screen.findByRole("status")).toHaveTextContent("TEST PAYMENT MODE ENABLED");
});
it("does not change mode when the real-money confirmation is declined", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(false);
  render(<PaymentMode settings />);
  fireEvent.click(await screen.findByRole("button", { name: /Disable test mode/ }));
  expect(request.mock.calls.every((c) => c[0] !== "/payments/mode")).toBe(true);
});
it("awaits the server change and refreshes mode after real-money confirmation", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  request.mockImplementation(async (path: string) =>
    path === "/payments/mode"
      ? { ok: true, testMode: false }
      : {
          enabled: true,
          testMode: request.mock.calls.some((c) => c[0] === "/payments/mode") ? false : true,
        },
  );
  render(<PaymentMode settings />);
  fireEvent.click(await screen.findByRole("button", { name: /Disable test mode/ }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith("/payments/mode", {
      method: "PUT",
      body: { mode: "live" },
    }),
  );
  expect(await screen.findByRole("button", { name: /Enable test mode/ })).toBeEnabled();
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("real money"));
});
