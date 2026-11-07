import { create } from "zustand";

interface UI {
  chatDrafts: Record<string, string>;
  setChatDraft: (key: string, value: string) => void;
  chatOpen: boolean;
  chatConversationId: string;
  chatPersonId?: string;
  openChat: (personId?: string) => void;
  setChatOpen: (open: boolean) => void;
  selectChat: (id: string) => void;

  caseDialog: { open: boolean; editId?: string };
  invoiceDialog: { open: boolean; caseId?: string; invoiceId?: string };
  clientDialog: { open: boolean; editId?: string };
  openCase: (editId?: string) => void;
  openInvoice: (o?: { caseId?: string; invoiceId?: string }) => void;
  openClient: (editId?: string) => void;
  close: () => void;
}

export const useUI = create<UI>()((set) => ({
  chatDrafts: {},
  setChatDraft: (key, value) => set((s) => ({ chatDrafts: { ...s.chatDrafts, [key]: value } })),
  chatOpen: false,
  chatConversationId: "",
  openChat: (personId) => set({ chatOpen: true, chatPersonId: personId }),
  setChatOpen: (chatOpen) => set({ chatOpen }),
  selectChat: (chatConversationId) => set({ chatConversationId, chatPersonId: undefined }),
  caseDialog: { open: false },
  invoiceDialog: { open: false },
  clientDialog: { open: false },
  openCase: (editId) => set({ caseDialog: { open: true, editId } }),
  openInvoice: (o) => set({ invoiceDialog: { open: true, ...o } }),
  openClient: (editId) => set({ clientDialog: { open: true, editId } }),
  close: () =>
    set({
      caseDialog: { open: false },
      invoiceDialog: { open: false },
      clientDialog: { open: false },
    }),
}));
