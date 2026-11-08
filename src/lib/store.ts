import { useUI } from "./ui-store";
import { create } from "zustand";
import { toast } from "sonner";
import { api, resetCsrf } from "./api";
import { canViewInvoices } from "./access";
import { visibleCasesFor } from "./access";
import { caseBilling } from "./billing";
import {
  iso,
  type Account,
  type User,
  type Client,
  type Case,
  type Invoice,
  type CalendarEvent,
  type Attachment,
  type Activity,
  type Conversation,
  type Notification,
  type CustomField,
} from "./domain";
export interface SavedView {
  id: string;
  name: string;
  builtIn?: boolean;
  filters: {
    status: string[];
    clientId: string;
    staffId: string;
    type: string;
    dateFrom: string;
    dateTo: string;
    mine?: boolean;
    search: string;
  };
}
export interface TablePrefs {
  visible: string[];
  order: string[];
  widths: Record<string, number>;
  pageSize: number;
}

export interface UserInput {
  name: string;
  email: string;
  username: string;
  password: string;
  company?: string;
  phone?: string;
  address?: string;
  title?: string;
  clientId?: string;
  role?: User["role"];
  managerId?: string;
}

const todayIso = () => iso(new Date());
const emptyFilters = {
  status: [],
  clientId: "",
  staffId: "",
  type: "",
  dateFrom: "",
  dateTo: "",
  search: "",
};
export const defaultViews = (): SavedView[] => {
  const t = todayIso();
  const in30 = iso(new Date(Date.now() + 30 * 864e5));
  return [
    { id: "all", name: "All Cases", builtIn: true, filters: { ...emptyFilters } },
    { id: "mine", name: "My Cases", builtIn: true, filters: { ...emptyFilters, mine: true } },
    {
      id: "active",
      name: "Active",
      builtIn: true,
      filters: { ...emptyFilters, status: ["Active"] },
    },
    {
      id: "pending",
      name: "Pending",
      builtIn: true,
      filters: { ...emptyFilters, status: ["Pending"] },
    },
    {
      id: "today",
      name: "Today's Services",
      builtIn: true,
      filters: { ...emptyFilters, dateFrom: t, dateTo: t },
    },
    {
      id: "upcoming",
      name: "Upcoming Services",
      builtIn: true,
      filters: {
        ...emptyFilters,
        dateFrom: t,
        dateTo: in30,
        status: ["Active", "Scheduled", "Pending"],
      },
    },
    {
      id: "completed",
      name: "Completed",
      builtIn: true,
      filters: { ...emptyFilters, status: ["Completed"] },
    },
  ];
};

export const uid = (prefix: string) => prefix + crypto.randomUUID();
export interface RolePermissions {
  role: "manager" | "staff";
  permissions: Record<string, boolean>;
  updatedAt: string;
}
interface Data {
  rolePermissions: RolePermissions[];
  accounts: Account[];
  users: User[];
  clients: Client[];
  cases: Case[];
  invoices: Invoice[];
  events: CalendarEvent[];
  activities: Activity[];
  conversations: Conversation[];
  notifications: Notification[];
  customFields: CustomField[];
  companyDocuments: Attachment[];
  chatRead: Record<string, string>;
  savedViews: SavedView[];
  tablePrefs: TablePrefs | null;
}
const emptyData = (): Data => ({
  rolePermissions: [],
  accounts: [{ id: "company", name: "LegalFlow" }],
  users: [],
  clients: [],
  cases: [],
  invoices: [],
  events: [],
  activities: [],
  conversations: [],
  notifications: [],
  customFields: [],
  companyDocuments: [],
  chatRead: {},
  savedViews: defaultViews(),
  tablePrefs: null,
});
interface State extends Data {
  ready: boolean;
  connectionError: string;
  sessionUserId: string | null;
  activeAccountId: string;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  login: (identity: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  registerCustomer: (input: UserInput) => Promise<string>;
  createUser: (input: UserInput) => Promise<string>;
  updateUserAccess: (
    id: string,
    patch: {
      role: User["role"];
      status: User["status"];
      password?: string;
      managerId?: string;
      permissions?: Record<string, boolean>;
      updatedAt?: string;
    },
  ) => Promise<string>;
  saveRolePermissions: (value: RolePermissions) => Promise<boolean>;
  deleteInvoice: (id: string, updatedAt?: string) => Promise<boolean>;
  addCase: (c: Case) => Promise<boolean>;
  updateCase: (id: string, patch: Partial<Case>, note?: string) => Promise<boolean>;
  deleteCase: (id: string) => Promise<boolean>;
  addAttachments: (caseId: string, files: Attachment[]) => Promise<boolean>;
  addCompanyDocuments: (files: Attachment[]) => Promise<string>;
  deleteCompanyDocument: (id: string) => Promise<boolean>;
  addComment: (id: string, text: string) => Promise<boolean>;
  upsertClient: (c: Client) => Promise<boolean>;
  deleteClient: (id: string) => Promise<boolean>;
  upsertInvoice: (i: Invoice) => Promise<boolean>;
  upsertEvent: (e: CalendarEvent) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  markRead: (id: string) => Promise<boolean>;
  markAllRead: () => Promise<boolean>;
  startChat: (otherId: string) => Promise<string>;
  sendMessage: (id: string, text: string) => Promise<boolean>;
  markConversationRead: (id: string) => Promise<void>;
  saveView: (view: SavedView) => Promise<boolean>;
  deleteView: (id: string) => Promise<boolean>;
  setTablePrefs: (prefs: TablePrefs) => Promise<boolean>;
  upsertCustomField: (field: CustomField) => Promise<boolean>;
  deleteCustomField: (id: string) => Promise<boolean>;
}
let initializing: Promise<void> | null = null;
let refreshing: Promise<void> | null = null;
let polling: ReturnType<typeof setInterval> | undefined;
let sessionEpoch = 0;
export const useStore = create<State>((set, get) => {
  const refresh = async () => {
    if (refreshing) return refreshing;
    const epoch = sessionEpoch;
    refreshing = (async () => {
      try {
        const data = await api<Data>("/workspace");
        if (epoch !== sessionEpoch) return;
        data.savedViews = [...defaultViews(), ...data.savedViews.filter((v) => !v.builtIn)];
        data.cases = data.cases.map((c) => ({ ...c, ...caseBilling(data.invoices, c.id) }) as Case);
        set({ ...data, connectionError: "" });
      } catch (e) {
        if (epoch !== sessionEpoch) return;
        set({ connectionError: (e as Error).message });
        if ((e as any).status === 401) {
          sessionEpoch++;
          set({ ...emptyData(), sessionUserId: null });
        }
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  };
  const mutate = async (path: string, method: string, body?: unknown) => {
    try {
      await api(path, { method, body });
      await refresh();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };
  const upload = async (files: Attachment[], caseId?: string) => {
    for (const f of files.filter((f) => f.pendingFile)) {
      const form = new FormData();
      if (caseId) form.append("caseId", caseId);
      form.append("file", f.pendingFile!);
      const saved = await api<Attachment>("/documents", {
        method: "POST",
        body: form,
        headers: { "X-Upload-Id": f.id },
      });
      Object.assign(f, saved, { pendingFile: undefined });
    }
    await refresh();
  };
  const saveCase = async (c: Case) => {
    try {
      await api(`/cases/${c.id}`, { method: "PUT", body: c });
      await upload(c.attachments, c.id);
      await refresh();
      return true;
    } catch (e) {
      await refresh();
      toast.error((e as Error).message);
      return false;
    }
  };
  const startPolling = () => {
    if (!polling)
      polling = setInterval(() => {
        if (get().sessionUserId && document.visibilityState === "visible") void refresh();
      }, 5000);
  };
  return {
    ...emptyData(),
    ready: false,
    connectionError: "",
    sessionUserId: null,
    activeAccountId: "company",
    initialize: async () => {
      if (initializing) return initializing;
      initializing = (async () => {
        try {
          const result = await api<{ user: User | null }>("/auth/session");
          if (result.user) {
            sessionEpoch++;
            set({ sessionUserId: result.user.id, users: [result.user] });
            await refresh();
            startPolling();
          }
          set({ ready: true });
        } catch (e) {
          set({ ready: true, connectionError: (e as Error).message });
        } finally {
          initializing = null;
        }
      })();
      return initializing;
    },
    refresh,
    login: async (identity, password) => {
      try {
        const r = await api<{ user: User }>("/auth/login", {
          method: "POST",
          body: { identity, password },
        });
        sessionEpoch++;
        set({ ...emptyData(), sessionUserId: r.user.id, users: [r.user], connectionError: "" });
        await refresh();
        startPolling();
        return true;
      } catch (e) {
        set({ connectionError: (e as Error).message });
        return false;
      }
    },
    logout: async () => {
      try {
        await api("/auth/logout", { method: "POST" });
        sessionEpoch++;
        set({ ...emptyData(), sessionUserId: null, connectionError: "" });
        resetCsrf();
        useUI.setState({
          chatDrafts: {},
          chatOpen: false,
          chatPersonId: undefined,
          chatConversationId: "",
          caseDialog: { open: false },
          invoiceDialog: { open: false },
          clientDialog: { open: false },
        });
        if (polling) {
          clearInterval(polling);
          polling = undefined;
        }
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    registerCustomer: async (input) => {
      try {
        const r = await api<{ user: User }>("/auth/register", { method: "POST", body: input });
        sessionEpoch++;
        set({ ...emptyData(), sessionUserId: r.user.id, users: [r.user] });
        await refresh();
        startPolling();
        return "";
      } catch (e) {
        return (e as Error).message;
      }
    },
    createUser: async (input) => {
      try {
        await api("/users", { method: "POST", body: input });
        await refresh();
        return "";
      } catch (e) {
        return (e as Error).message;
      }
    },
    updateUserAccess: async (id, patch) => {
      try {
        await api(`/users/${id}/access`, { method: "PATCH", body: patch });
        await refresh();
        return "";
      } catch (e) {
        return (e as Error).message;
      }
    },
    saveRolePermissions: (value) => mutate(`/permissions/${value.role}`, "PUT", value),
    deleteInvoice: (id, updatedAt) => mutate(`/invoices/${id}`, "DELETE", { updatedAt }),
    addCase: saveCase,
    updateCase: async (id, patch) => {
      const old = get().cases.find((c) => c.id === id);
      if (!old) return false;
      try {
        if (patch.attachments) {
          const retained = new Set(patch.attachments.map((a) => a.id));
          for (const a of old.attachments.filter((a) => !retained.has(a.id)))
            await api(`/documents/${a.id}`, { method: "DELETE" });
        }
        return await saveCase({ ...old, ...patch });
      } catch (e) {
        await refresh();
        toast.error((e as Error).message);
        return false;
      }
    },
    deleteCase: (id) => mutate(`/cases/${id}`, "DELETE"),
    addAttachments: async (id, files) => {
      try {
        await upload(files, id);
        return true;
      } catch (e) {
        await refresh();
        toast.error((e as Error).message);
        return false;
      }
    },
    addCompanyDocuments: async (files) => {
      try {
        await upload(files);
        return "";
      } catch (e) {
        await refresh();
        return (e as Error).message;
      }
    },
    deleteCompanyDocument: (id) => mutate(`/documents/${id}`, "DELETE"),
    addComment: (id, text) => mutate(`/cases/${id}/comments`, "POST", { text }),
    upsertClient: (c) => mutate(`/clients/${c.id}`, "PUT", c),
    deleteClient: (id) => mutate(`/clients/${id}`, "DELETE"),
    upsertInvoice: (i) => mutate(`/invoices/${i.id}`, "PUT", i),
    upsertEvent: (e) => mutate(`/events/${e.id}`, "PUT", e),
    deleteEvent: (id) => mutate(`/events/${id}`, "DELETE"),
    markRead: (id) => mutate("/notifications/read", "POST", { id }),
    markAllRead: () => mutate("/notifications/read", "POST", {}),
    startChat: async (otherId) => {
      try {
        const r = await api<{ id: string }>("/conversations", {
          method: "POST",
          body: { otherId },
        });
        await refresh();
        return r.id;
      } catch (e) {
        toast.error((e as Error).message);
        return "";
      }
    },
    sendMessage: (id, text) => mutate(`/conversations/${id}/messages`, "POST", { text }),
    markConversationRead: async (id) => {
      const conv = get().conversations.find((c) => c.id === id);
      const last = conv?.messages.at(-1)?.id;
      const key = `${get().sessionUserId}:${id}`;
      if (!last || get().chatRead[key] === last) return;
      try {
        await api(`/conversations/${id}/read`, { method: "POST", body: { lastMessageId: last } });
        set({ chatRead: { ...get().chatRead, [key]: last } });
      } catch {
        /* A later refresh can retry without losing the conversation. */
      }
    },
    saveView: (view) =>
      mutate("/preferences", "PATCH", {
        savedViews: [...get().savedViews.filter((v) => !v.builtIn && v.id !== view.id), view],
      }),
    deleteView: (id) =>
      mutate("/preferences", "PATCH", {
        savedViews: get().savedViews.filter((v) => !v.builtIn && v.id !== id),
      }),
    setTablePrefs: (prefs) => mutate("/preferences", "PATCH", { tablePrefs: prefs }),
    upsertCustomField: (f) => mutate(`/custom-fields/${f.id}`, "PUT", f),
    deleteCustomField: (id) => mutate(`/custom-fields/${id}`, "DELETE"),
  };
});
export const useMe = () => {
  const id = useStore((s) => s.sessionUserId);
  const users = useStore((s) => s.users);
  return users.find((u) => u.id === id) ?? null;
};
export function useVisibleCases() {
  const me = useMe();
  const cases = useStore((s) => s.cases);
  const clients = useStore((s) => s.clients);
  return visibleCasesFor(me, cases, clients, "company");
}
export const canAccess = (subject: string | User | null | undefined, section: string) => {
  const role = typeof subject === "string" ? subject : subject?.role;
  if (section === "permissions") return role === "owner";
  if (section === "invoices" && typeof subject !== "string") return canViewInvoices(subject);
  if (["ai", "ai-insights", "automations"].includes(section)) return false;
  if (section === "company-documents") return role === "owner";
  if (role === "customer")
    return [
      "dashboard",
      "cases",
      "invoices",
      "communications",
      "settings",
      "notifications",
    ].includes(section);
  if (!role) return false;
  if (role === "owner") return true;
  if (role === "manager") return !["users"].includes(section);
  return !["users", "reports", "automations", "invoices"].includes(section);
};

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
export const invoiceTotal = (i: Invoice) => {
  const sub = i.lines.reduce((s, l) => s + l.qty * l.price, 0);
  return { sub, tax: (sub * i.taxRate) / 100, total: sub * (1 + i.taxRate / 100) };
};
export const fmtDate = (d: string) =>
  d
    ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
