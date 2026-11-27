import { afterEach, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FileTypeBadge, fileTypeInfo } from "../components/lf/file-type-badge";
afterEach(cleanup);
it("recognizes PDF and Excel filenames even when older metadata says other", () => {
  expect(fileTypeInfo({ name: "report.PDF", type: "other" }).kind).toBe("pdf");
  expect(fileTypeInfo({ name: "Transactions.xlsx", type: "other" }).kind).toBe("excel");
  expect(fileTypeInfo({ name: "Ledger.xls" }).kind).toBe("excel");
  expect(
    fileTypeInfo({ mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      .kind,
  ).toBe("excel");
});
it("renders labeled large and compact file badges", () => {
  const view = render(<FileTypeBadge file={{ name: "Writ.pdf" }} />);
  expect(screen.getByRole("img", { name: "PDF document" })).toHaveAttribute("width", "86");
  expect(screen.getByText("PDF")).toBeInTheDocument();
  view.rerender(<FileTypeBadge compact file={{ name: "Ledger.xlsx" }} />);
  expect(screen.getByRole("img", { name: "Excel spreadsheet" })).toHaveAttribute("width", "44");
  expect(screen.getByText("XLSX")).toBeInTheDocument();
});
