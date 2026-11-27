import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { PermissionChecklist } from "../components/lf/permission-checklist";
afterEach(cleanup);
it("unchecking an inherited permission saves explicit denial and reset clears exceptions", () => {
  const change = vi.fn();
  render(
    <PermissionChecklist defaults={{ "files.upload": true }} overrides={{}} onChange={change} />,
  );
  fireEvent.click(screen.getByLabelText("Upload files and capture photos"));
  expect(change).toHaveBeenLastCalledWith({ "files.upload": false });
  fireEvent.click(screen.getByText("Reset to role defaults"));
  expect(change).toHaveBeenLastCalledWith({});
});
it("admin cannot add beyond preset and protected permission administration stays disabled", () => {
  render(<PermissionChecklist defaults={{}} overrides={{}} onChange={() => {}} ceiling />);
  expect(screen.getByLabelText("Delete cases")).toBeDisabled();
  expect(screen.getByLabelText("Manage role defaults and permission exceptions")).toBeDisabled();
});
