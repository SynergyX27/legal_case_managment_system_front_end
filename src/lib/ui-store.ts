import { create } from "zustand";

interface UI {
  caseDialog: { open: boolean; editId?: string };
  invoiceDialog: { open: boolean; caseId?: string; invoiceId?: string };
  clientDialog: { open: boolean; editId?: string };
  aiOpen: boolean;
  openCase: (editId?: string) => void;
  openInvoice: (o?: { caseId?: string; invoiceId?: string }) => void;
  openClient: (editId?: string) => void;
  close: () => void;
  setAi: (v: boolean) => void;
}

export const useUI = create<UI>()((set) => ({
  caseDialog: { open: false },
  invoiceDialog: { open: false },
  clientDialog: { open: false },
  aiOpen: false,
  openCase: (editId) => set({ caseDialog: { open: true, editId } }),
  openInvoice: (o) => set({ invoiceDialog: { open: true, ...o } }),
  openClient: (editId) => set({ clientDialog: { open: true, editId } }),
  close: () => set({ caseDialog: { open: false }, invoiceDialog: { open: false }, clientDialog: { open: false } }),
  setAi: (aiOpen) => set({ aiOpen }),
}));
