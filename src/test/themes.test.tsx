import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ThemeProvider } from "../components/lf/theme-provider";
import { ThemePicker } from "../components/lf/theme-picker";
import { useStore } from "../lib/store";
beforeEach(() => {
  localStorage.clear();
  useStore.setState({ sessionUserId: "theme-user-a" });
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});
afterEach(cleanup);
it("previews without changing the live theme, applies, cancels and restores Grey", () => {
  render(
    <ThemeProvider>
      <ThemePicker />
    </ThemeProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Royal Violet/ }));
  expect(document.documentElement.dataset["palette"]).toBe("grey");
  fireEvent.click(screen.getByRole("button", { name: "Apply theme" }));
  expect(document.documentElement.dataset["palette"]).toBe("violet");
  fireEvent.click(screen.getByRole("button", { name: /Sunset/ }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(document.documentElement.dataset["palette"]).toBe("violet");
  fireEvent.click(screen.getByRole("button", { name: "Restore default" }));
  expect(document.documentElement.dataset["palette"]).toBe("grey");
  expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#345f91");
});
it("restores a saved palette and isolates the preference by account", () => {
  localStorage.setItem(
    "legalflow-appearance:theme-user-a",
    JSON.stringify({ palette: "ocean", mode: "dark" }),
  );
  const view = render(
    <ThemeProvider>
      <ThemePicker />
    </ThemeProvider>,
  );
  expect(document.documentElement.dataset["palette"]).toBe("ocean");
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  view.unmount();
  useStore.setState({ sessionUserId: "theme-user-b" });
  render(
    <ThemeProvider>
      <ThemePicker />
    </ThemeProvider>,
  );
  expect(document.documentElement.dataset["palette"]).toBe("grey");
  expect(document.documentElement.classList.contains("dark")).toBe(false);
});
it("previews Grey, saves it, and keeps an explicitly saved Classic selection", () => {
  localStorage.setItem(
    "legalflow-appearance:theme-user-a",
    JSON.stringify({ palette: "classic", mode: "light" }),
  );
  const view = render(
    <ThemeProvider>
      <ThemePicker />
    </ThemeProvider>,
  );
  expect(document.documentElement.dataset["palette"]).toBe("classic");
  fireEvent.click(screen.getByRole("button", { name: /^Grey/ }));
  expect(document.documentElement.dataset["palette"]).toBe("classic");
  fireEvent.click(screen.getByRole("button", { name: "Apply theme" }));
  expect(document.documentElement.dataset["palette"]).toBe("grey");
  expect(JSON.parse(localStorage.getItem("legalflow-appearance:theme-user-a")!).palette).toBe(
    "grey",
  );
  view.unmount();
  render(
    <ThemeProvider>
      <ThemePicker />
    </ThemeProvider>,
  );
  expect(document.documentElement.dataset["palette"]).toBe("grey");
});
