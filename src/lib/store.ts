import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  buildSeed, iso, type Case, type Client, type Invoice, type CalendarEvent, type Notification,
  type Automation, type CustomField, type User, type Activity, type Attachment,
} from "./mock-data";

export interface SavedView {
  id: string; name: string; builtIn?: boolean;
  filters: { status: string[]; clientId: string; staffId: string; type: string; dateFrom: string; dateTo: string; mine?: boolean; search: string };
}
export interface TablePrefs { visible: string[]; order: string[]; widths: Record<string, number>; pageSize: number }

const seed = () => buildSeed();
type Seed = ReturnType<typeof buildSeed>;

const todayIso = () => iso(new Date());
const emptyFilters = { status: [], clientId: "", staffId: "", type: "", dateFrom: "", dateTo: "", search: "" };

interface State extends Seed {
  sessionUserId: string | null;
  activeAccountId: string | "all";
  savedViews: SavedView[];
  tablePrefs: TablePrefs | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  setAccount: (id: string) => void;
  addCase: (c: Case) => void;
  updateCase: (id: string, patch: Partial<Case>, note?: string) => void;
  deleteCase: (id: string) => void;
  addAttachments: (caseId: string, a: Attachment[]) => void;
  addComment: (caseId: string, text: string) => void;
  addActivity: (caseId: string, text: string, kind?: string) => void;
  upsertClient: (c: Client) => void;
  deleteClient: (id: string) => void;
  upsertInvoice: (i: Invoice) => void;
  upsertEvent: (e: CalendarEvent) => void;
  deleteEvent: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  notify: (kind: string, text: string, link?: string) => void;
  sendMessage: (convId: string, text: string, file?: string) => void;
  upsertAutomation: (a: Automation) => void;
  upsertCustomField: (f: CustomField) => void;
  deleteCustomField: (id: string) => void;
  upsertUser: (u: User) => void;
  saveView: (v: SavedView) => void;
  deleteView: (id: string) => void;
  setTablePrefs: (p: TablePrefs) => void;
  resetDemo: () => void;
}

export const defaultViews = (): SavedView[] => {
  const t = todayIso();
  const in30 = iso(new Date(Date.now() + 30 * 864e5));
  return [
    { id: "all", name: "All Cases", builtIn: true, filters: { ...emptyFilters } },
    { id: "mine", name: "My Cases", builtIn: true, filters: { ...emptyFilters, mine: true } },
    { id: "active", name: "Active", builtIn: true, filters: { ...emptyFilters, status: ["Active"] } },
    { id: "pending", name: "Pending", builtIn: true, filters: { ...emptyFilters, status: ["Pending"] } },
    { id: "today", name: "Today's Services", builtIn: true, filters: { ...emptyFilters, dateFrom: t, dateTo: t } },
    { id: "upcoming", name: "Upcoming Services", builtIn: true, filters: { ...emptyFilters, dateFrom: t, dateTo: in30, status: ["Active", "Scheduled", "Pending"] } },
    { id: "completed", name: "Completed", builtIn: true, filters: { ...emptyFilters, status: ["Completed"] } },
  ];
};

let idc = 0;
export const uid = (p: string) => `${p}${Date.now().toString(36)}${(idc++).toString(36)}`;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...seed(),
      sessionUserId: null,
      activeAccountId: "all",
      savedViews: defaultViews(),
      tablePrefs: null,
      login: (email, password) => {
        const u = get().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
        if (!u || password !== "password123" || u.status !== "Active") return false;
        set({ sessionUserId: u.id, activeAccountId: u.role === "owner" ? "all" : u.accountId });
        return true;
      },
      logout: () => set({ sessionUserId: null }),
      setAccount: (id) => set({ activeAccountId: id }),
      addActivity: (caseId, text, kind = "note") => {
        const me = get().users.find((u) => u.id === get().sessionUserId);
        const a: Activity = { id: uid("ac"), caseId, text, by: me?.name ?? "System", at: new Date().toISOString(), kind };
        set({ activities: [a, ...get().activities] });
      },
      addCase: (c) => {
        set({ cases: [c, ...get().cases] });
        get().addActivity(c.id, "Case created", "created");
        const staff = get().users.find((u) => u.id === c.staffId);
        get().notify("assigned", `New case ${c.number} assigned to ${staff?.name ?? "staff"}`, `/cases/${c.id}`);
      },
      updateCase: (id, patch, note) => {
        const old = get().cases.find((c) => c.id === id);
        if (!old) return;
        set({ cases: get().cases.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: todayIso() } : c)) });
        if (patch.status && patch.status !== old.status) {
          get().addActivity(id, `Status changed from ${old.status} to ${patch.status}`, "status");
          get().notify("status", `Case ${old.number} status changed to ${patch.status}`, `/cases/${id}`);
        }
        if (patch.serviceDate && patch.serviceDate !== old.serviceDate) {
          get().addActivity(id, `Service date updated from ${old.serviceDate} to ${patch.serviceDate}`, "service");
          get().notify("service", `Service date updated for ${old.number}`, `/cases/${id}`);
        }
        if (patch.staffId && patch.staffId !== old.staffId) {
          const s = get().users.find((u) => u.id === patch.staffId);
          get().addActivity(id, `${s?.name} assigned to case`, "assigned");
        }
        if (note) get().addActivity(id, note);
      },
      deleteCase: (id) => set({ cases: get().cases.filter((c) => c.id !== id) }),
      addAttachments: (caseId, a) => {
        set({ cases: get().cases.map((c) => (c.id === caseId ? { ...c, attachments: [...a, ...c.attachments] } : c)) });
        a.forEach((x) => get().addActivity(caseId, `Document uploaded: ${x.name}`, "document"));
      },
      addComment: (caseId, text) => {
        const by = get().sessionUserId ?? "u1";
        set({ cases: get().cases.map((c) => (c.id === caseId ? { ...c, comments: [...c.comments, { id: uid("cm"), by, text, at: new Date().toISOString() }] } : c)) });
        get().addActivity(caseId, "New comment added", "comment");
      },
      upsertClient: (c) => {
        const exists = get().clients.some((x) => x.id === c.id);
        set({ clients: exists ? get().clients.map((x) => (x.id === c.id ? c : x)) : [c, ...get().clients] });
      },
      deleteClient: (id) => set({ clients: get().clients.filter((c) => c.id !== id) }),
      upsertInvoice: (i) => {
        const exists = get().invoices.some((x) => x.id === i.id);
        set({ invoices: exists ? get().invoices.map((x) => (x.id === i.id ? i : x)) : [i, ...get().invoices] });
        set({ cases: get().cases.map((c) => (c.id === i.caseId ? { ...c, invoiceStatus: i.status, paymentStatus: i.status === "Paid" ? "Paid" : "Unpaid" } : c)) });
        if (!exists) {
          get().addActivity(i.caseId, `Invoice ${i.number} created`, "invoice");
          get().notify("invoice", `Invoice ${i.number} created`, `/invoices`);
        }
      },
      upsertEvent: (e) => {
        const exists = get().events.some((x) => x.id === e.id);
        set({ events: exists ? get().events.map((x) => (x.id === e.id ? e : x)) : [...get().events, e] });
      },
      deleteEvent: (id) => set({ events: get().events.filter((e) => e.id !== id) }),
      markRead: (id) => set({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }),
      markAllRead: () => set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) }),
      notify: (kind, text, link) => set({ notifications: [{ id: uid("n"), kind, text, link, at: new Date().toISOString(), read: false }, ...get().notifications] }),
      sendMessage: (convId, text, file) => {
        const by = get().sessionUserId ?? "u1";
        set({ conversations: get().conversations.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, { id: uid("m"), by, text, file, at: new Date().toISOString() }] } : c)) });
      },
      upsertAutomation: (a) => {
        const exists = get().automations.some((x) => x.id === a.id);
        set({ automations: exists ? get().automations.map((x) => (x.id === a.id ? a : x)) : [...get().automations, a] });
      },
      upsertCustomField: (f) => {
        const exists = get().customFields.some((x) => x.id === f.id);
        set({ customFields: exists ? get().customFields.map((x) => (x.id === f.id ? f : x)) : [...get().customFields, f] });
      },
      deleteCustomField: (id) => set({ customFields: get().customFields.filter((f) => f.id !== id) }),
      upsertUser: (u) => {
        const exists = get().users.some((x) => x.id === u.id);
        set({ users: exists ? get().users.map((x) => (x.id === u.id ? u : x)) : [...get().users, u] });
      },
      saveView: (v) => set({ savedViews: [...get().savedViews.filter((x) => x.id !== v.id), v] }),
      deleteView: (id) => set({ savedViews: get().savedViews.filter((v) => v.id !== id) }),
      setTablePrefs: (p) => set({ tablePrefs: p }),
      resetDemo: () => set({ ...seed(), savedViews: defaultViews(), tablePrefs: null }),
    }),
    { name: "legalflow-demo-v1", skipHydration: true },
  ),
);

export const useMe = () => {
  const id = useStore((s) => s.sessionUserId);
  const users = useStore((s) => s.users);
  return users.find((u) => u.id === id) ?? null;
};

/** Simulated role-based visibility. */
export function useVisibleCases() {
  const me = useMe();
  const cases = useStore((s) => s.cases);
  const clients = useStore((s) => s.clients);
  const acct = useStore((s) => s.activeAccountId);
  if (!me) return [];
  return cases.filter((c) => {
    const cl = clients.find((x) => x.id === c.clientId);
    if (me.role === "owner") return acct === "all" || cl?.accountId === acct;
    if (me.role === "manager") return c.managerId === me.id;
    return c.staffId === me.id;
  });
}

export const canAccess = (role: string | undefined, section: string) => {
  if (role === "owner") return true;
  if (role === "manager") return !["users"].includes(section);
  return !["users", "reports", "automations", "invoices"].includes(section);
};

export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
export const invoiceTotal = (i: Invoice) => {
  const sub = i.lines.reduce((s, l) => s + l.qty * l.price, 0);
  return { sub, tax: (sub * i.taxRate) / 100, total: sub * (1 + i.taxRate / 100) };
};
export const fmtDate = (d: string) => (d ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
