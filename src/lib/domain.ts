export type Role = "owner" | "manager" | "staff" | "customer";
export type CaseStatus = "Active" | "Pending" | "Scheduled" | "Completed" | "Cancelled";
export type Priority = "Low" | "Medium" | "High" | "Urgent";
export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue";

export interface User {
  username?: string;
  managerId?: string;
  permissions?: Record<string, boolean>;
  permissionOverrides?: Record<string, boolean>;
  updatedAt?: string;
  phone?: string;
  id: string;
  name: string;
  email: string;
  role: Role;
  accountId: string;
  clientId?: string;
  status: "Active" | "Inactive";
  lastLogin: string;
  title: string;
  online: boolean;
}
export interface Account {
  id: string;
  name: string;
}
export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  status: "Active" | "On Hold" | "Inactive";
  accountId: string;
}
export interface Attachment {
  id: string;
  name: string;
  type: "image" | "video" | "pdf" | "word" | "excel" | "other";
  size: string;
  uploadedAt: string;
  uploadedBy: string;
  url?: string;
  pendingFile?: File;
}
export interface Activity {
  id: string;
  caseId: string;
  text: string;
  by: string;
  at: string;
  kind: string;
}
export interface Comment {
  id: string;
  by: string;
  text: string;
  at: string;
}
export interface Case {
  accountId?: string;
  ref?: string;
  plaintiff?: string;
  county?: string;
  city?: string;
  state?: string;
  zip?: string;
  visLO?: string;
  visTO?: string;
  locs?: string;
  lbx?: string;
  id: string;
  number: string;
  title: string;
  description: string;
  type: string;
  status: CaseStatus;
  priority: Priority;
  clientId: string;
  residentName: string;
  residentAddress: string;
  residentPhone: string;
  notes: string;
  serviceDate: string;
  serviceTime: string;
  staffId: string;
  managerId: string;
  serviceLocation: string;
  instructions: string;
  fee: number;
  invoiceStatus: InvoiceStatus | "Not Invoiced";
  paymentStatus: "Unpaid" | "Paid" | "Partial";
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
  comments: Comment[];
  court: string;
  jurisdiction: string;
  custom: Record<string, string | number | boolean>;
}
export interface InvoiceLine {
  description: string;
  qty: number;
  price: number;
}
export interface Invoice {
  paymentMethod?: "stripe";
  updatedAt?: string;
  id: string;
  number: string;
  clientId: string;
  caseId: string;
  date: string;
  dueDate: string;
  lines: InvoiceLine[];
  taxRate: number;
  status: InvoiceStatus;
  paidAt?: string;
}
export interface Notification {
  id: string;
  kind: string;
  text: string;
  at: string;
  read: boolean;
  link?: string;
}
export interface Message {
  id: string;
  by: string;
  text: string;
  at: string;
  file?: string;
}
export interface Conversation {
  id: string;
  name: string;
  kind: "dm" | "group" | "channel" | "case";
  members: string[];
  caseId?: string;
  messages: Message[];
}
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  staffId: string;
  location: string;
  notes: string;
}
export interface CustomField {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "dropdown" | "checkbox" | "email" | "phone" | "textarea";
  required: boolean;
  options: string[];
}

export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const CASE_TYPES = [
  "Eviction Notice",
  "Summons Service",
  "Subpoena",
  "Small Claims",
  "Writ of Possession",
  "Divorce Papers",
  "Restraining Order",
  "Debt Collection",
];
export const STATUSES: CaseStatus[] = ["Active", "Pending", "Scheduled", "Completed", "Cancelled"];
export const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Urgent"];
