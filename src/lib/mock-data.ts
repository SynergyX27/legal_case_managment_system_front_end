// Deterministic fictional demo data. Built lazily (never at module scope side effects beyond pure math).
export type Role = "owner" | "manager" | "staff";
export type CaseStatus = "Active" | "Pending" | "Scheduled" | "Completed" | "Cancelled";
export type Priority = "Low" | "Medium" | "High" | "Urgent";
export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue";

export interface User {
  id: string; name: string; email: string; role: Role; accountId: string;
  status: "Active" | "Inactive"; lastLogin: string; title: string; online: boolean;
}
export interface Account { id: string; name: string }
export interface Client {
  id: string; name: string; company: string; email: string; phone: string; address: string;
  status: "Active" | "On Hold" | "Inactive"; accountId: string;
}
export interface Attachment {
  id: string; name: string; type: "image" | "video" | "pdf" | "word" | "excel" | "other";
  size: string; uploadedAt: string; uploadedBy: string; url?: string;
}
export interface Activity { id: string; caseId: string; text: string; by: string; at: string; kind: string }
export interface Comment { id: string; by: string; text: string; at: string }
export interface Case {
  id: string; number: string; title: string; description: string; type: string;
  status: CaseStatus; priority: Priority; clientId: string; residentName: string;
  residentAddress: string; residentPhone: string; notes: string; serviceDate: string;
  serviceTime: string; staffId: string; managerId: string; serviceLocation: string;
  instructions: string; fee: number; invoiceStatus: InvoiceStatus | "Not Invoiced";
  paymentStatus: "Unpaid" | "Paid" | "Partial"; createdAt: string; updatedAt: string;
  attachments: Attachment[]; comments: Comment[]; court: string; jurisdiction: string;
  custom: Record<string, string | number | boolean>;
}
export interface InvoiceLine { description: string; qty: number; price: number }
export interface Invoice {
  id: string; number: string; clientId: string; caseId: string; date: string; dueDate: string;
  lines: InvoiceLine[]; taxRate: number; status: InvoiceStatus;
}
export interface Notification { id: string; kind: string; text: string; at: string; read: boolean; link?: string }
export interface Message { id: string; by: string; text: string; at: string; file?: string }
export interface Conversation {
  id: string; name: string; kind: "dm" | "group" | "channel" | "case"; members: string[];
  caseId?: string; messages: Message[];
}
export interface Automation {
  id: string; name: string; trigger: string; action: string; enabled: boolean; lastRun: string; runs: number;
}
export interface CalendarEvent {
  id: string; title: string; date: string; time: string; staffId: string; location: string; notes: string;
}
export interface CustomField {
  id: string; label: string; type: "text" | "number" | "date" | "dropdown" | "checkbox" | "email" | "phone" | "textarea";
  required: boolean; options: string[];
}

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];
export const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (base: Date, n: number) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };

export const CASE_TYPES = ["Eviction Notice", "Summons Service", "Subpoena", "Small Claims", "Writ of Possession", "Divorce Papers", "Restraining Order", "Debt Collection"];
export const STATUSES: CaseStatus[] = ["Active", "Pending", "Scheduled", "Completed", "Cancelled"];
export const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Urgent"];

export function buildSeed() {
  const r = rng(42);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const accounts: Account[] = [
    { id: "acc1", name: "Harbor & Pine Legal" },
    { id: "acc2", name: "Northgate Property Group" },
    { id: "acc3", name: "Meridian Process Services" },
  ];

  const users: User[] = [
    { id: "u1", name: "Eleanor Whitfield", email: "owner@legalflow.demo", role: "owner", accountId: "acc1", title: "Managing Partner" },
    { id: "u2", name: "Marcus Delgado", email: "manager@legalflow.demo", role: "manager", accountId: "acc1", title: "Account Manager" },
    { id: "u3", name: "Priya Raman", email: "staff@legalflow.demo", role: "staff", accountId: "acc1", title: "Process Server" },
    { id: "u4", name: "Daniel Okafor", email: "daniel.okafor@legalflow.demo", role: "manager", accountId: "acc2", title: "Account Manager" },
    { id: "u5", name: "Hannah Leclerc", email: "hannah.leclerc@legalflow.demo", role: "staff", accountId: "acc1", title: "Paralegal" },
    { id: "u6", name: "Tomás Rivera", email: "tomas.rivera@legalflow.demo", role: "staff", accountId: "acc2", title: "Process Server" },
    { id: "u7", name: "Grace Kim", email: "grace.kim@legalflow.demo", role: "staff", accountId: "acc3", title: "Field Agent" },
    { id: "u8", name: "Samuel Brooks", email: "samuel.brooks@legalflow.demo", role: "staff", accountId: "acc1", title: "Process Server" },
    { id: "u9", name: "Aisha Bello", email: "aisha.bello@legalflow.demo", role: "staff", accountId: "acc3", title: "Paralegal" },
  ].map((u, i) => ({ ...u, role: u.role as Role, status: i === 8 ? "Inactive" : "Active", lastLogin: iso(addDays(today, -Math.floor(r() * 6))), online: i % 3 !== 2 } as User));
  const staff = users.filter((u) => u.role === "staff");
  const managers = users.filter((u) => u.role === "manager");

  const clientDefs: [string, string][] = [
    ["Rebecca Thornton", "Thornton Realty"], ["James Holloway", "Holloway & Sons"], ["Olivia Chen", "Pacific Crest Apartments"],
    ["Michael Ferreira", "Ferreira Law Group"], ["Sophia Nakamura", "Lakeside Property Mgmt"], ["William Grant", "Grant Capital Lending"],
    ["Isabella Moreau", "Moreau Family Law"], ["Ethan Caldwell", "Caldwell Housing Trust"], ["Ava Sinclair", "Sinclair Credit Union"],
    ["Noah Patel", "Patel Commercial Leasing"], ["Mia Donovan", "Donovan & Reyes LLP"], ["Lucas Bennett", "Bennett Estates"],
  ];
  const streets = ["Maple Ave", "Oak Street", "Harbor Blvd", "Cedar Lane", "Pine Ridge Rd", "Elm Court", "Willow Way", "Birch Drive", "Lakeview Terrace", "Summit Ave"];
  const cities = ["Springfield, IL 62704", "Riverton, WA 98101", "Fairview, OR 97024", "Brookside, CA 94110", "Ashford, TX 78701"];
  const clients: Client[] = clientDefs.map(([name, company], i) => ({
    id: `c${i + 1}`, name, company,
    email: `${name.split(" ")[0].toLowerCase()}@${company.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "")}.com`,
    phone: `(555) ${String(200 + i * 37).padStart(3, "0")}-${String(1000 + i * 413).slice(0, 4)}`,
    address: `${100 + i * 17} ${pick(r, streets)}, ${pick(r, cities)}`,
    status: i === 10 ? "On Hold" : i === 11 ? "Inactive" : "Active",
    accountId: accounts[i % 3].id,
  }));

  const first = ["Robert", "Linda", "Kevin", "Maria", "Brian", "Angela", "Jason", "Teresa", "Carlos", "Nicole", "Derek", "Monica", "Victor", "Sandra", "Paul"];
  const last = ["Harper", "Dawson", "Mitchell", "Vargas", "Coleman", "Price", "Fletcher", "Nguyen", "Shaw", "Ortega", "Lambert", "Hayes"];
  const imgs = [
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600",
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600",
  ];

  const cases: Case[] = [];
  const activities: Activity[] = [];
  for (let i = 0; i < 28; i++) {
    const client = clients[i % clients.length];
    const st: CaseStatus = pick(r, ["Active", "Active", "Pending", "Scheduled", "Scheduled", "Completed", "Cancelled"] as CaseStatus[]);
    const created = addDays(today, -Math.floor(r() * 60) - 5);
    const svcOffset = st === "Completed" ? -Math.floor(r() * 20) - 1 : Math.floor(r() * 30) - 3;
    const s = staff[i % staff.length];
    const m = managers[i % managers.length];
    const id = `case${i + 1}`;
    const residentName = `${pick(r, first)} ${pick(r, last)}`;
    const nAtt = Math.floor(r() * 4);
    const attachments: Attachment[] = Array.from({ length: nAtt }, (_, k) => {
      const t = (["image", "pdf", "word", "video"] as const)[k % 4];
      return {
        id: `${id}-a${k}`, type: t,
        name: t === "image" ? `property-photo-${k + 1}.jpg` : t === "pdf" ? `service-affidavit-${i + 1}.pdf` : t === "word" ? `notice-draft-${i + 1}.docx` : `service-recording-${k}.mp4`,
        size: `${(r() * 4 + 0.2).toFixed(1)} MB`, uploadedAt: iso(addDays(created, k + 1)), uploadedBy: s.name,
        url: t === "image" ? imgs[(i + k) % imgs.length] : undefined,
      };
    });
    const fee = [85, 120, 150, 175, 225, 300, 450][Math.floor(r() * 7)];
    const invoiceStatus: Case["invoiceStatus"] = st === "Completed" ? pick(r, ["Paid", "Sent", "Overdue"] as InvoiceStatus[]) : st === "Cancelled" ? "Not Invoiced" : pick(r, ["Not Invoiced", "Draft", "Sent"] as Case["invoiceStatus"][]);
    cases.push({
      id, number: `LF-2026-${String(1041 + i).padStart(4, "0")}`,
      title: `${client.company} v. ${residentName}`, description: `Service of legal documents to ${residentName} on behalf of ${client.company}.`,
      type: pick(r, CASE_TYPES), status: st, priority: pick(r, PRIORITIES), clientId: client.id, residentName,
      residentAddress: i === 6 || i === 17 ? "" : `${200 + i * 11} ${pick(r, streets)}, ${pick(r, cities)}`,
      residentPhone: `(555) ${300 + i}-${String(4000 + i * 97).slice(0, 4)}`, notes: i % 4 === 0 ? "Gate code 4471. Dog on premises." : "",
      serviceDate: iso(addDays(today, svcOffset)), serviceTime: `${String(8 + (i % 9)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
      staffId: s.id, managerId: m.id, serviceLocation: "Residence", instructions: "Personal service preferred. Attempt up to 3 times.",
      fee, invoiceStatus, paymentStatus: invoiceStatus === "Paid" ? "Paid" : "Unpaid",
      createdAt: iso(created), updatedAt: iso(addDays(today, -Math.floor(r() * 5))), attachments,
      comments: i % 3 === 0 ? [{ id: `${id}-cm1`, by: m.id, text: "Client requested an evening attempt if the first fails.", at: iso(addDays(today, -2)) }] : [],
      court: pick(r, ["Superior Court – Dept. 12", "District Court – Div. 3", "County Civil Court", "Municipal Court"]),
      jurisdiction: pick(r, ["King County", "Cook County", "Multnomah County", "Travis County"]), custom: {},
    });
    activities.push(
      { id: `${id}-ac1`, caseId: id, text: "Case created", by: m.name, at: iso(created), kind: "created" },
      { id: `${id}-ac2`, caseId: id, text: `${s.name} assigned to case`, by: m.name, at: iso(addDays(created, 1)), kind: "assigned" },
    );
    if (st !== "Pending") activities.push({ id: `${id}-ac3`, caseId: id, text: `Status changed from Pending to ${st}`, by: m.name, at: iso(addDays(created, 2)), kind: "status" });
    attachments.forEach((a) => activities.push({ id: `${a.id}-ac`, caseId: id, text: `Document uploaded: ${a.name}`, by: a.uploadedBy, at: a.uploadedAt, kind: "document" }));
  }
  // intentional duplicates for AI demo
  cases[19].residentName = cases[4].residentName; cases[19].clientId = cases[4].clientId; cases[19].type = cases[4].type;

  const invoices: Invoice[] = cases
    .filter((c) => c.invoiceStatus !== "Not Invoiced")
    .slice(0, 18)
    .map((c, i) => {
      const d = addDays(new Date(c.serviceDate), 1);
      return {
        id: `inv${i + 1}`, number: `INV-${String(3201 + i)}`, clientId: c.clientId, caseId: c.id, date: iso(d), dueDate: iso(addDays(d, 30)),
        lines: [{ description: `${c.type} – process service`, qty: 1, price: c.fee }, ...(i % 3 === 0 ? [{ description: "Mileage surcharge", qty: 24, price: 0.65 }] : [])],
        taxRate: 8, status: c.invoiceStatus as InvoiceStatus,
      };
    });

  const events: CalendarEvent[] = [
    { id: "ev1", title: "Team stand-up", date: iso(today), time: "09:00", staffId: "u2", location: "Conference Room A", notes: "" },
    { id: "ev2", title: "Client review – Thornton Realty", date: iso(addDays(today, 2)), time: "14:00", staffId: "u1", location: "Zoom", notes: "" },
    { id: "ev3", title: "Court filing deadline", date: iso(addDays(today, 5)), time: "16:00", staffId: "u5", location: "County Civil Court", notes: "" },
  ];

  const kinds: [string, string][] = [
    ["status", "Case LF-2026-1043 status changed to Active"], ["document", "New document uploaded to LF-2026-1047"],
    ["service", "Service date updated for LF-2026-1050"], ["assigned", "New case LF-2026-1062 assigned to you"],
    ["invoice", "Invoice INV-3204 created"], ["overdue", "Invoice INV-3207 is overdue"], ["message", "Marcus Delgado sent you a message"],
  ];
  const notifications: Notification[] = Array.from({ length: 22 }, (_, i) => ({
    id: `n${i + 1}`, kind: kinds[i % kinds.length][0], text: kinds[i % kinds.length][1].replace(/\d{4}$/, (x) => String(Number(x) + i)),
    at: new Date(today.getTime() - i * 3.5 * 3600_000).toISOString(), read: i > 6,
  }));

  const hr = (h: number) => new Date(today.getTime() - h * 3600_000).toISOString();
  const conversations: Conversation[] = [
    { id: "ch1", name: "general", kind: "channel", members: users.map((u) => u.id), messages: [
      { id: "m1", by: "u1", text: "Morning all — reminder that Q4 billing closes Friday.", at: hr(26) },
      { id: "m2", by: "u2", text: "Thanks Eleanor. I'll have Northgate invoices out by Thursday.", at: hr(25) },
      { id: "m3", by: "u5", text: "Updated the eviction notice template in Settings → Email Templates.", at: hr(3) },
    ]},
    { id: "ch2", name: "field-team", kind: "channel", members: ["u2", "u3", "u6", "u7", "u8"], messages: [
      { id: "m4", by: "u3", text: "Completed 4 services in Riverton today. Affidavits uploaded.", at: hr(20) },
      { id: "m5", by: "u8", text: "Heads up: Harbor Blvd building has a new gate code.", at: hr(6) },
    ]},
    { id: "dm1", name: "Marcus Delgado", kind: "dm", members: ["u1", "u2"], messages: [
      { id: "m6", by: "u2", text: "Can you approve the fee change on LF-2026-1044?", at: hr(4) },
      { id: "m7", by: "u1", text: "Approved. Go ahead and re-issue the invoice.", at: hr(3.5) },
    ]},
    { id: "dm2", name: "Priya Raman", kind: "dm", members: ["u1", "u3", "u2"], messages: [
      { id: "m8", by: "u3", text: "Resident at LF-2026-1046 wasn't home, re-attempting tomorrow 7pm.", at: hr(2), file: "attempt-photo.jpg" },
    ]},
    { id: "g1", name: "Billing Squad", kind: "group", members: ["u1", "u2", "u4", "u5"], messages: [
      { id: "m9", by: "u4", text: "3 overdue invoices for Grant Capital — sending reminders.", at: hr(30) },
    ]},
    { id: "cs1", name: cases[0].number, kind: "case", caseId: cases[0].id, members: ["u1", "u2", "u3"], messages: [
      { id: "m10", by: "u2", text: "Client confirmed resident's work schedule — try after 6pm.", at: hr(10) },
    ]},
    { id: "cs2", name: cases[2].number, kind: "case", caseId: cases[2].id, members: ["u1", "u2", "u5"], messages: [
      { id: "m11", by: "u5", text: "Draft notice uploaded for review.", at: hr(8) },
    ]},
  ];

  const automations: Automation[] = [
    { id: "au1", name: "Status change alerts", trigger: "Case status changes", action: "Send email and in-app notification to authorized users", enabled: true, lastRun: hr(1), runs: 342 },
    { id: "au2", name: "Service date reminder", trigger: "Service date is approaching (24h)", action: "Send automatic reminder to assigned staff", enabled: true, lastRun: hr(5), runs: 198 },
    { id: "au3", name: "New case assignment", trigger: "New case created", action: "Notify assigned staff", enabled: true, lastRun: hr(9), runs: 127 },
    { id: "au4", name: "Auto-invoice on completion", trigger: "Case marked as completed", action: "Generate an invoice", enabled: true, lastRun: hr(28), runs: 86 },
    { id: "au5", name: "Overdue payment reminder", trigger: "Invoice becomes overdue", action: "Send payment reminder to client", enabled: false, lastRun: hr(96), runs: 41 },
  ];

  const customFields: CustomField[] = [
    { id: "cf1", label: "Court Reference #", type: "text", required: false, options: [] },
    { id: "cf2", label: "Service Method", type: "dropdown", required: false, options: ["Personal", "Substituted", "Posting", "Certified Mail"] },
  ];

  return { accounts, users, clients, cases, activities, invoices, events, notifications, conversations, automations, customFields };
}
