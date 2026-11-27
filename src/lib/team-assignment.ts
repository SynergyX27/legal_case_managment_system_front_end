import type { Case, User } from "./domain";
export function canEditTeamMember(me: User | undefined | null, user: User, rows: Case[]) {
  if (rows.some((c) => c.staffId === user.id || c.managerId === user.id)) return false;
  return me?.role === "owner"
    ? ["staff", "manager"].includes(user.role) &&
        (user.status === "Active" || rows.every((c) => c.teamMemberIds?.includes(user.id)))
    : me?.role === "manager" &&
        user.status === "Active" &&
        user.role === "staff" &&
        user.managerId === me.id;
}
export function assignedTeamIds(rows: Case[]) {
  return [
    ...new Set(
      rows.flatMap((c) => [c.staffId, c.managerId, ...(c.teamMemberIds || [])].filter(Boolean)),
    ),
  ];
}
