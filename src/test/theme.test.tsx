import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider, ThemeToggle } from "@/components/lf/theme-provider";
afterEach(() => {
  cleanup();
  localStorage.removeItem("legalflow-theme");
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
});
describe("Appearance preference", () => {
  it("toggles the document and remembers the explicit selection", async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const toggle = await screen.findByRole("button", { name: "Switch to dark mode" });
    await waitFor(() => expect(toggle).toBeEnabled());
    fireEvent.click(toggle);
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("legalflow-theme")).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
    expect(document.documentElement).not.toHaveClass("dark");
    expect(localStorage.getItem("legalflow-theme")).toBe("light");
  });
  it("restores an existing dark preference", async () => {
    localStorage.setItem("legalflow-theme", "dark");
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    await screen.findByRole("button", { name: "Switch to light mode" });
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });
  it("responds when the preference changes in another tab", async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
    localStorage.setItem("legalflow-theme", "dark");
    fireEvent(window, new StorageEvent("storage", { key: "legalflow-theme", newValue: "dark" }));
    await screen.findByRole("button", { name: "Switch to light mode" });
    expect(document.documentElement).toHaveClass("dark");
  });
});
