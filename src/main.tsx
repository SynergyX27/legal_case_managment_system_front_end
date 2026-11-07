import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
const router = getRouter();
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
// Theme preferences are local. No account or case data is read from browser storage.
try {
  localStorage.removeItem("legalflow-demo-v1");
  const mode = localStorage.getItem("legalflow-theme");
  document.documentElement.classList.toggle(
    "dark",
    mode === "dark" || (!mode && matchMedia("(prefers-color-scheme: dark)").matches),
  );
} catch {}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
