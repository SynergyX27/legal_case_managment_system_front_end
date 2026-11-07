import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  MessageCircle,
  MessagesSquare,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "./ui-bits";
import { useMe, useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { canMessage, canReadConversation } from "@/lib/access";
import { conversationTitle, conversationUnread } from "@/lib/messaging";
import { cn } from "@/lib/utils";

export function MessengerPanel({
  compact = false,
  initialPerson,
}: {
  compact?: boolean;
  initialPerson?: string;
}) {
  const s = useStore(),
    me = useMe(),
    ui = useUI();
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState(""),
    [contactsTab, setContactsTab] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null),
    inputRef = useRef<HTMLTextAreaElement>(null);
  const selected = ui.chatConversationId;
  const conversations = s.conversations.filter((c) => canReadConversation(me, c, s.users, s.cases));
  const contacts = s.users.filter((u) => canMessage(me, u, s.cases));
  const active = conversations.find((c) => c.id === selected);
  const title = active && me ? conversationTitle(active, me.id, s.users) : "";
  const visible = conversations
    .filter((c) =>
      conversationTitle(c, me?.id ?? "", s.users)
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => (b.messages.at(-1)?.at ?? "").localeCompare(a.messages.at(-1)?.at ?? ""));
  const person = ui.chatPersonId ?? initialPerson;
  const draftKey = `${me?.id}:${selected}`;
  const draft = ui.chatDrafts[draftKey] ?? "";
  useEffect(() => {
    if (person) {
      let cancelled = false;
      void s.startChat(person).then((id) => {
        if (id && !cancelled) {
          ui.selectChat(id);
          setContactsTab(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }
  }, [person, s.startChat, ui.selectChat]);
  useEffect(() => {
    if (active) {
      s.markConversationRead(active.id);
      const el = messagesRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [active?.id, active?.messages.length, s.markConversationRead]);
  useEffect(() => {
    if (active) inputRef.current?.focus({ preventScroll: true });
  }, [active?.id]);
  if (!me) return null;
  const send = async () => {
    if (sending || !active || !draft.trim()) return;
    const original = draft;
    setSending(true);
    try {
      if (!(await s.sendMessage(active.id, original.trim()))) return;
      if (useUI.getState().chatDrafts[draftKey] === original) ui.setChatDraft(draftKey, "");
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  };
  const list = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 pb-4 pt-5">
        <div className="mb-4 flex rounded-xl bg-muted p-1">
          <button
            className={cn("messenger-tab", !contactsTab && "is-active")}
            onClick={() => {
              setContactsTab(false);
              setQuery("");
            }}
          >
            <MessagesSquare className="size-4" />
            Messages
          </button>
          <button
            className={cn("messenger-tab", contactsTab && "is-active")}
            onClick={() => {
              setContactsTab(true);
              setQuery("");
            }}
          >
            <Users className="size-4" />
            People
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <input
            className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            aria-label={contactsTab ? "Search contacts" : "Search conversations"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={contactsTab ? "Find someone…" : "Search messages…"}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {contactsTab
          ? contacts
              .filter((u) => (u.name + " " + u.role).toLowerCase().includes(query.toLowerCase()))
              .map((u) => (
                <button
                  key={u.id}
                  onClick={async () => {
                    const id = await s.startChat(u.id);
                    if (id) {
                      ui.selectChat(id);
                      setContactsTab(false);
                      setQuery("");
                    }
                  }}
                  className="messenger-person"
                >
                  <Avatar name={u.name} className="size-10 rounded-2xl" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{u.name}</span>
                    <span className="mt-1 block text-xs capitalize text-muted-foreground">
                      {u.role === "customer" ? "Customer" : u.title || u.role}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              ))
          : visible.map((c) => {
              const unread = conversationUnread(c, me.id, s.chatRead ?? {}),
                name = conversationTitle(c, me.id, s.users),
                last = c.messages.at(-1);
              return (
                <button
                  key={c.id}
                  className={cn("messenger-person", selected === c.id && "is-selected")}
                  onClick={() => {
                    ui.selectChat(c.id);
                    setQuery("");
                  }}
                >
                  <Avatar name={name} className="size-11 rounded-2xl" />
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{name}</span>
                      {last && (
                        <time className="shrink-0 text-[10px] text-muted-foreground">
                          {new Date(last.at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </time>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="flex-1 truncate text-xs text-muted-foreground">
                        {last?.by === me.id ? "You: " : ""}
                        {last?.text || "Say hello to start a conversation"}
                      </span>
                      {unread > 0 && (
                        <span className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                          {unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
        {((contactsTab &&
          !contacts.filter((u) =>
            (u.name + " " + u.role).toLowerCase().includes(query.toLowerCase()),
          ).length) ||
          (!contactsTab && !visible.length)) && (
          <div className="px-4 py-12 text-center">
            <MessageCircle className="mx-auto mb-3 size-8 text-primary/50" />
            <p className="text-sm font-medium">
              {query ? "No matches found" : "Your conversations start here"}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {query ? "Try a different name." : "Choose People to contact your team."}
            </p>
            {!contactsTab && !query && (
              <Button className="mt-4" size="sm" onClick={() => setContactsTab(true)}>
                Find your team
              </Button>
            )}
          </div>
        )}
      </div>
      <p className="border-t px-5 py-3 text-[11px] text-muted-foreground">
        {me.role === "customer"
          ? "Your assigned case team & owner"
          : "Conversations with your team and customers"}
      </p>
    </div>
  );
  return (
    <div className={cn("messenger-body", compact ? "is-compact" : "is-full")}>
      <aside className={cn("messenger-list", compact && active && "hidden")}>{list}</aside>
      {active ? (
        <section className="messenger-conversation">
          <header className="flex shrink-0 items-center gap-3 border-b bg-card px-4 py-4 sm:px-5">
            <Button
              variant="ghost"
              size="icon"
              className={compact ? "" : "md:hidden"}
              aria-label="Back to conversations"
              onClick={() => ui.selectChat("")}
            >
              <ArrowLeft />
            </Button>
            <Avatar name={title} className="size-10 rounded-2xl" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{title}</h3>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {active.kind === "dm"
                  ? s.users.find((u) => u.id === active.members.find((id) => id !== me.id))
                      ?.title || "Direct conversation"
                  : `${active.members.length} members · ${active.kind}`}
              </p>
            </div>
          </header>
          <div ref={messagesRef} className="messenger-history">
            <p className="mb-6 text-center text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Beginning of conversation
            </p>
            {active.messages.map((m, i) => {
              const mine = m.by === me.id;
              const previous = active.messages[i - 1];
              const newDay =
                !previous || new Date(previous.at).toDateString() !== new Date(m.at).toDateString();
              return (
                <div key={m.id}>
                  {newDay && (
                    <div className="my-5 text-center">
                      <span className="rounded-full border bg-card px-3 py-1 text-[10px] text-muted-foreground">
                        {new Date(m.at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                  <div className={cn("mb-4 flex items-end gap-2", mine && "justify-end")}>
                    {!mine && !compact && (
                      <Avatar
                        name={s.users.find((u) => u.id === m.by)?.name ?? "Team"}
                        className="mb-1 size-7"
                      />
                    )}
                    <div className={cn("message-bubble", mine ? "is-mine" : "is-theirs")}>
                      {!mine && (
                        <p className="mb-1.5 text-[10px] font-semibold opacity-65">
                          {s.users.find((u) => u.id === m.by)?.name ?? "Team"}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {m.text}
                      </p>

                      <p className="mt-2 flex items-center justify-end gap-1 text-[10px] opacity-60">
                        <time>
                          {new Date(m.at).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                        {mine && <Check className="size-3" />}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {!active.messages.length && (
              <div className="flex min-h-44 flex-col items-center justify-center text-center">
                <Avatar name={title} className="mb-4 size-14 rounded-2xl" />
                <p className="font-semibold">Say hello to {title.split(" ")[0]}</p>
                <p className="mt-2 max-w-52 text-xs leading-relaxed text-muted-foreground">
                  Ask a question or share an update about your case.
                </p>
              </div>
            )}
          </div>
          <div className="shrink-0 border-t bg-card p-4">
            <form
              className="flex items-end gap-2 rounded-2xl border bg-background p-2 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <textarea
                ref={inputRef}
                aria-label="Message"
                rows={2}
                maxLength={4000}
                placeholder="Write your message…"
                value={draft}
                onChange={(e) => ui.setChatDraft(draftKey, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                className="max-h-28 min-h-12 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
              />
              <Button
                type="submit"
                size="icon"
                className="shrink-0 rounded-xl"
                disabled={sending || !draft.trim()}
                aria-label="Send message"
              >
                <Send className="size-4" />
              </Button>
            </form>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Enter to send · Shift + Enter for a new line
            </p>
          </div>
        </section>
      ) : (
        !compact && (
          <div className="messenger-empty">
            <div className="relative mb-7 flex size-24 items-center justify-center rounded-[28px] bg-primary/10">
              <MessagesSquare className="size-10 text-primary" />
              <span className="absolute -right-2 -top-2 rounded-xl border bg-card p-2 shadow-sm">
                <MessageCircle className="size-5 text-primary" />
              </span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">A little closer to your team.</h2>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Keep case updates, questions and conversations together in one place.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => setContactsTab(true)}>
              Start a conversation <ArrowUpRight />
            </Button>
          </div>
        )
      )}
    </div>
  );
}
export function FloatingMessenger() {
  const s = useStore(),
    me = useMe(),
    ui = useUI(),
    navigate = useNavigate();
  const launcher = useRef<HTMLButtonElement>(null),
    windowRef = useRef<HTMLDivElement>(null);
  const inboxPage = useRouterState({ select: (s) => s.location.pathname === "/communications" });
  const restoreFocus = () => {
    (inboxPage ? document.getElementById("open-chat-popup") : launcher.current)?.focus({
      preventScroll: true,
    });
  };
  const close = () => {
    ui.setChatOpen(false);
    restoreFocus();
  };
  useEffect(() => {
    if (!ui.chatOpen) return;
    (windowRef.current?.querySelector<HTMLTextAreaElement>("textarea") ?? windowRef.current)?.focus(
      { preventScroll: true },
    );
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        ui.setChatOpen(false);
        restoreFocus();
      }
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!windowRef.current?.contains(target) && !launcher.current?.contains(target))
        ui.setChatOpen(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
    };
  }, [ui.chatOpen, ui.setChatOpen]);
  if (!me) return null;
  const unread = s.conversations
    .filter((c) => canReadConversation(me, c, s.users, s.cases))
    .reduce((sum, c) => sum + conversationUnread(c, me.id, s.chatRead ?? {}), 0);
  return (
    <>
      <button
        ref={launcher}
        aria-label={ui.chatOpen ? "Close chat" : "Open chat"}
        title="Messages"
        className={cn("chat-launcher", inboxPage && !ui.chatOpen && "inbox-launcher-hidden")}
        aria-controls="floating-chat-window"
        aria-expanded={ui.chatOpen}
        onClick={() => ui.setChatOpen(!ui.chatOpen)}
      >
        <span className="chat-launcher-icon">
          {ui.chatOpen ? <X className="size-6" /> : <MessageCircle className="size-7" />}
        </span>
        {!ui.chatOpen && unread > 0 && (
          <span className="chat-unread">{unread > 99 ? "99+" : unread}</span>
        )}
      </button>
      {ui.chatOpen && (
        <div
          ref={windowRef}
          id="floating-chat-window"
          role="dialog"
          aria-modal="false"
          aria-labelledby="floating-chat-title"
          tabIndex={-1}
          className="chat-popup fixed bottom-[96px] right-7 outline-none max-md:bottom-[86px] max-md:right-3"
        >
          <header className="chat-popup-header">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-white/15 p-2">
                <MessagesSquare className="size-5" />
              </span>
              <div>
                <h2 id="floating-chat-title" className="text-base font-semibold">
                  Your conversations
                </h2>
                <p className="mt-0.5 text-[11px] text-white/65">Your team, just a message away.</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                className="chat-header-button"
                title="Open full messaging view"
                aria-label="Expand messages"
                onClick={() => {
                  ui.setChatOpen(false);
                  navigate({ to: "/communications", search: { person: undefined } });
                }}
              >
                <ArrowUpRight className="size-4" />
              </button>
              <button className="chat-header-button" aria-label="Close chat window" onClick={close}>
                <X className="size-4" />
              </button>
            </div>
          </header>
          <MessengerPanel compact key={me.id} />
          <div className="border-t bg-card px-4 py-2 text-center text-[10px] text-muted-foreground">
            Private messages · synchronized to your account
          </div>
        </div>
      )}
    </>
  );
}
