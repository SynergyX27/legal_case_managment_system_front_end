import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { conversationUnread } from "@/lib/messaging";
describe("Chat read state and drafts", () => {
  beforeEach(() => {
    useStore.getState().resetDemo();
    useStore.getState().logout();
    useUI.setState({
      chatOpen: false,
      chatConversationId: "",
      chatDrafts: {},
      chatPersonId: undefined,
    });
  });
  it("keeps read markers separate for every user across replies", async () => {
    await useStore.getState().login("customer@legalflow.demo", "password123");
    const chat = useStore.getState().startChat("u1");
    useStore.getState().sendMessage(chat, "Question");
    await useStore.getState().login("owner@legalflow.demo", "password123");
    let s = useStore.getState(),
      c = s.conversations.find((c) => c.id === chat)!;
    expect(conversationUnread(c, "u1", s.chatRead)).toBe(1);
    s.markConversationRead(chat);
    s = useStore.getState();
    expect(conversationUnread(c, "u1", s.chatRead)).toBe(0);
    s.sendMessage(chat, "Reply");
    s = useStore.getState();
    c = s.conversations.find((c) => c.id === chat)!;
    expect(conversationUnread(c, "customer1", s.chatRead)).toBe(1);
    expect(conversationUnread(c, "u1", s.chatRead)).toBe(0);
  });
  it("refuses marking an inaccessible conversation as read", async () => {
    await useStore.getState().login("customer@legalflow.demo", "password123");
    useStore.getState().markConversationRead("ch1");
    expect(useStore.getState().chatRead).toEqual({});
  });
  it("retains an unfinished draft when chat is closed and reopened", async () => {
    const ui = useUI.getState();
    ui.selectChat("dm1");
    ui.setChatDraft("u1:dm1", "Unfinished message");
    ui.setChatOpen(false);
    ui.openChat();
    expect(useUI.getState().chatDrafts["u1:dm1"]).toBe("Unfinished message");
    expect(useUI.getState().chatConversationId).toBe("dm1");
    expect(useUI.getState().chatDrafts["customer1:dm1"]).toBeUndefined();
  });
});
