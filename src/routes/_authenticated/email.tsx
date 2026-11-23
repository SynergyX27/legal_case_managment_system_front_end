import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mail, Plus, Send, Paperclip } from "lucide-react";
import { api } from "@/lib/api";
import { useMe, useStore } from "@/lib/store";
import { PageHeader } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
export const Route = createFileRoute("/_authenticated/email")({ component: Email });
function Email() {
  const s = useStore(),
    me = useMe();
  const [threads, setThreads] = useState<any[]>([]),
    [selected, setSelected] = useState(""),
    [messages, setMessages] = useState<any[]>([]),
    [next, setNext] = useState<string | null>(null),
    [caseId, setCase] = useState(""),
    [customerUserId, setCustomer] = useState(""),
    [recipients, setRecipients] = useState<any[]>([]),
    [subject, setSubject] = useState(""),
    [text, setText] = useState(""),
    [attachments, setAttachments] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [search, setSearch] = useState("");
  const history = useRef(false);
  const attempt = useRef({ key: "", id: "" }),
    bottom = useRef<HTMLDivElement>(null);
  const thread = threads.find((t) => t.id === selected),
    row = s.cases.find((c) => c.id === (thread?.caseId || caseId));
  const load = async () => {
    try {
      const r = await api("/email/threads");
      setThreads(r.threads);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    let alive = true;
    if (!caseId) {
      setRecipients([]);
      return;
    }
    api("/email/recipients?caseId=" + encodeURIComponent(caseId))
      .then((r) => {
        if (alive) {
          setRecipients(r.recipients);
          setCustomer(r.recipients[0]?.id || "");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [caseId]);
  useEffect(() => {
    let alive = true;
    history.current = false;
    setMessages([]);
    setError("");
    setText("");
    setAttachments([]);
    setNext(null);
    if (!selected) return;
    const fetchMessages = async () => {
      try {
        const r = await api("/email/threads/" + selected);
        if (alive) {
          setMessages((prev) =>
            history.current
              ? [...prev.filter((m) => !r.messages.some((x: any) => x.id === m.id)), ...r.messages]
              : r.messages,
          );
          if (!history.current) setNext(r.nextBefore);
          await api("/email/threads/" + selected + "/read", { method: "POST" });
        }
      } catch (e) {
        if (alive) {
          setMessages([]);
          setError((e as Error).message);
        }
      }
    };
    void fetchMessages();
    const timer = setInterval(fetchMessages, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [selected]);
  const send = async () => {
    if (busy) return;
    const payload = {
      ...(selected ? { threadId: selected } : { caseId, customerUserId }),
      subject: thread?.subject || subject,
      text,
      attachmentIds: attachments,
    };
    const key = JSON.stringify(payload);
    if (attempt.current.key !== key) attempt.current = { key, id: crypto.randomUUID() };
    setBusy(true);
    try {
      const r = await api("/email/send", {
        method: "POST",
        body: { ...payload, requestId: attempt.current.id },
      });
      attempt.current = { key: "", id: "" };
      setText("");
      setAttachments([]);
      setError("");
      await load();
      if (selected === r.id) {
        const r2 = await api("/email/threads/" + r.id);
        setMessages(r2.messages);
        setNext(r2.nextBefore);
      } else setSelected(r.id);
      toast.success("Message queued for email delivery");
      setTimeout(() => bottom.current?.scrollIntoView({ block: "nearest" }), 50);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const download = async (a: any) => {
    try {
      const r = await fetch("/api/email/attachments/" + encodeURIComponent(a.id), {
        credentials: "same-origin",
      });
      if (!r.ok) throw new Error((await r.json()).error);
      const url = URL.createObjectURL(await r.blob()),
        link = document.createElement("a");
      link.href = url;
      link.download = a.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <>
      <PageHeader
        title="Email"
        subtitle="Case conversations with registered customers. Replies from their email inbox appear in the same thread."
        actions={
          <Button
            disabled={busy}
            onClick={() => {
              setSelected("");
              setMessages([]);
              setText("");
              setAttachments([]);
              setSubject("");
              setError("");
            }}
          >
            <Plus className="mr-2 size-4" />
            New email
          </Button>
        }
      />
      <div className="grid min-h-[650px] overflow-hidden rounded-2xl border bg-card lg:grid-cols-[310px_1fr]">
        <aside className="border-b lg:border-b-0 lg:border-r">
          <div className="p-4">
            <Input
              aria-label="Search email conversations"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {threads
              .filter((t) =>
                (t.subject + " " + t.caseNumber + " " + t.customerName)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((t) => (
                <button
                  key={t.id}
                  className={`block w-full border-b p-4 text-left hover:bg-accent ${selected === t.id ? "bg-accent" : ""}`}
                  onClick={() => setSelected(t.id)}
                >
                  <span className="flex justify-between gap-2 font-medium">
                    <span className="truncate">{t.customerName}</span>
                    {t.unread > 0 && (
                      <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">
                        {t.unread}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-sm">{t.subject}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t.caseNumber} · {new Date(t.updatedAt).toLocaleDateString()}
                  </span>
                </button>
              ))}
            {threads.length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">
                No email conversations yet. Choose a case to get started.
              </p>
            )}
          </div>
        </aside>
        <section className="flex min-w-0 flex-col">
          <div className="border-b p-5">
            {selected ? (
              <>
                <h2 className="font-semibold">{thread?.subject || "Email conversation"}</h2>
                <p className="text-sm text-muted-foreground">
                  {thread?.caseNumber} · {thread?.customerName}
                </p>
              </>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  Case
                  <select
                    required
                    aria-label="Email case"
                    className="mt-1 w-full rounded border bg-background p-2"
                    value={caseId}
                    onChange={(e) => {
                      setCase(e.target.value);
                      setAttachments([]);
                    }}
                  >
                    <option value="">Select case</option>
                    {s.cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.number} · {c.residentName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Registered customer
                  <select
                    required
                    aria-label="Email customer"
                    className="mt-1 w-full rounded border bg-background p-2"
                    value={customerUserId}
                    onChange={(e) => setCustomer(e.target.value)}
                  >
                    <option value="">Select recipient</option>
                    {recipients.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} · {u.email}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  className="sm:col-span-2"
                  aria-label="Email subject"
                  placeholder="Subject"
                  value={subject}
                  maxLength={200}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5" style={{ maxHeight: 500 }}>
            {next && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const r = await api(
                      "/email/threads/" + selected + "?before=" + encodeURIComponent(next),
                    );
                    history.current = true;
                    setMessages((p) => [...r.messages, ...p]);
                    setNext(r.nextBefore);
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                Load earlier emails
              </Button>
            )}
            {messages.map((m) => (
              <article
                key={m.id}
                className={`max-w-[95%] rounded-xl border p-4 ${m.direction === "outgoing" ? "ml-auto bg-primary/5" : "bg-muted/40"}`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{m.from}</span>
                  <span>{new Date(m.at).toLocaleString()}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
                {m.attachments.map((a: any) => (
                  <Button
                    className="mt-2 mr-2 max-w-full"
                    variant="outline"
                    size="sm"
                    key={a.id}
                    onClick={() => download(a)}
                    disabled={a.state !== "ready"}
                  >
                    <Paperclip className="mr-1 size-3" />
                    <span className="truncate">{a.name}</span>
                    {a.state !== "ready" ? " · Saving…" : ""}
                  </Button>
                ))}
                <p className="mt-2 text-xs text-muted-foreground">
                  {m.channel === "email"
                    ? "Received by email"
                    : m.deliveryState === "sent"
                      ? "Sent to mail server"
                      : m.deliveryState === "failed"
                        ? "Delivery failed — owner can retry in Settings"
                        : m.deliveryState === "pending" || m.deliveryState === "sending"
                          ? "Queued for delivery"
                          : m.deliveryState}
                </p>
              </article>
            ))}
            <div ref={bottom} />
          </div>
          <div className="space-y-3 border-t p-5">
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Textarea
              disabled={busy}
              aria-label="Email message"
              rows={4}
              maxLength={50000}
              placeholder="Write your message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {row && row.attachments.length > 0 && (
              <details>
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Attach case documents (up to 5 files, 5 MB each, 10 MB total)
                </summary>
                <div className="mt-2 max-h-32 overflow-y-auto">
                  {row.attachments.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        checked={attachments.includes(a.id)}
                        onChange={(e) =>
                          setAttachments(
                            e.target.checked
                              ? [...attachments, a.id]
                              : attachments.filter((id) => id !== a.id),
                          )
                        }
                      />
                      {a.name}
                    </label>
                  ))}
                </div>
              </details>
            )}
            <Button
              disabled={
                busy ||
                !text.trim() ||
                (!selected && (!caseId || !customerUserId || !subject.trim()))
              }
              onClick={send}
            >
              <Send className="mr-2 size-4" />
              {busy ? "Queuing…" : "Send email"}
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
