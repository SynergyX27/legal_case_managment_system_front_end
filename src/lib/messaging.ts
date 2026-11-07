import type { Conversation, User } from "./domain";
export const conversationTitle = (conversation: Conversation, userId: string, users: User[]) =>
  conversation.kind === "dm"
    ? (users.find((u) => u.id === conversation.members.find((id) => id !== userId))?.name ??
      conversation.name)
    : conversation.name;
export const conversationUnread = (
  conversation: Conversation,
  userId: string,
  seen: Record<string, string>,
) => {
  const read = seen[`${userId}:${conversation.id}`];
  const cutoff = read ? conversation.messages.findIndex((m) => m.id === read) : -1;
  return conversation.messages.filter((m, i) => i > cutoff && m.by !== userId).length;
};
