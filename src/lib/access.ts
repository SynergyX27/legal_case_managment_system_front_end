import type { User, Case, Client, Conversation } from "./domain";
export function visibleCasesFor(
  me: User | null | undefined,
  cases: Case[],
  clients: Client[],
  account = "all",
) {
  if (!me || me.status !== "Active") return [];
  return cases.filter((c) =>
    me.role === "owner"
      ? true
      : me.role === "customer"
        ? !!me.clientId && c.clientId === me.clientId
        : me.role === "manager"
          ? c.managerId === me.id
          : c.staffId === me.id,
  );
}
export const canBill = (me: User | null | undefined) =>
  me?.role === "owner" || me?.role === "manager";
export function canMessage(me: User | undefined | null, other: User | undefined, cases: Case[]) {
  if (!me || !other || me.id === other.id || me.status !== "Active" || other.status !== "Active")
    return false;
  if (me.role === "owner" || other.role === "owner") return true;
  if (me.role !== "customer" && other.role !== "customer") return true;
  const customer = me.role === "customer" ? me : other,
    staff = me.role === "customer" ? other : me;
  return (
    staff.role !== "customer" &&
    !!customer.clientId &&
    cases.some(
      (c) =>
        c.clientId === customer.clientId && (c.staffId === staff.id || c.managerId === staff.id),
    )
  );
}
export function canReadConversation(
  me: User | undefined | null,
  conversation: Conversation,
  users: User[],
  cases: Case[],
) {
  if (!me || !conversation.members.includes(me.id)) return false;
  if (conversation.kind === "dm")
    return (
      conversation.members.length === 2 &&
      canMessage(
        me,
        users.find((u) => u.id === conversation.members.find((id) => id !== me.id)),
        cases,
      )
    );
  return (
    me.role !== "customer" &&
    conversation.members.every((id) => users.find((u) => u.id === id)?.role !== "customer")
  );
}
