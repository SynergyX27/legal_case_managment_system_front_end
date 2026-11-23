import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ModernSelect } from "@/components/ui/modern-select";
afterEach(cleanup);
it("preserves empty form values and exposes themed options with keyboard selection", () => {
  const change = vi.fn();
  const {container} = render(<form><ModernSelect aria-label="Community" name="workspace" value="" required onChange={change}><option value="">Assign later</option><option value="alpha">Alpha community</option></ModernSelect></form>);
  const trigger = screen.getByRole("combobox", {name:"Community"});
  expect(trigger.textContent).toContain("Assign later");
  expect(container.querySelector("select")?.value).toBe("");
  expect(container.querySelector("form")?.checkValidity()).toBe(false);
  fireEvent.keyDown(trigger, {key:"Enter"});
  const option = screen.getByRole("option", {name:"Alpha community"});
  fireEvent.keyDown(option, {key:"Enter"});
  expect(change.mock.calls[0][0].target.value).toBe("alpha");
});
it("keeps disabled dropdowns unavailable", () => {
 render(<ModernSelect aria-label="Manager" value="m" disabled><option value="m">Assigned manager</option></ModernSelect>);
 expect(screen.getByRole("combobox").hasAttribute("disabled")).toBe(true);
});
