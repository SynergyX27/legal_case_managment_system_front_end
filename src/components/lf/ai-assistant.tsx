import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUI } from "@/lib/ui-store";
import { useStore, useVisibleCases } from "@/lib/store";

type Msg = { role: "user" | "ai"; text: string };
const suggestions = ["Find duplicate cases", "Which cases are missing addresses?", "Summarize urgent cases", "Show services this week"];

/** Mock assistant: answers are computed from local demo data with simple keyword rules. */
export function AiAssistant() {
  const { aiOpen, setAi } = useUI();
  const cases = useVisibleCases();
  const users = useStore((s) => s.users);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "ai", text: "Hi! I'm the LegalFlow assistant (demo). Ask me to find duplicates, spot missing data, or search cases in plain English." }]);
  const [q, setQ] = useState("");

  const answer = (t: string): string => {
    const l = t.toLowerCase();
    if (l.includes("duplicate")) {
      const seen = new Map<string, string>(); const d: string[] = [];
      cases.forEach((c) => { const k = c.residentName + c.clientId; if (seen.has(k)) d.push(`${seen.get(k)} ↔ ${c.number} (${c.residentName})`); else seen.set(k, c.number); });
      return d.length ? `I found ${d.length} possible duplicate pair(s):\n• ${d.join("\n• ")}\nOpen AI Insights to review and merge.` : "No duplicate case records detected.";
    }
    if (l.includes("missing") || l.includes("address")) {
      const m = cases.filter((c) => !c.residentAddress);
      return m.length ? `${m.length} case(s) are missing a resident address: ${m.map((c) => c.number).join(", ")}.` : "All cases have resident addresses.";
    }
    if (l.includes("urgent") || l.includes("summar")) {
      const u = cases.filter((c) => c.priority === "Urgent" && c.status !== "Completed");
      return `${u.length} open urgent case(s):\n${u.slice(0, 6).map((c) => `• ${c.number} – ${c.type}, service ${c.serviceDate}, ${users.find((x) => x.id === c.staffId)?.name}`).join("\n")}`;
    }
    if (l.includes("week") || l.includes("service")) {
      const now = Date.now(); const w = cases.filter((c) => { const d = new Date(c.serviceDate).getTime(); return d >= now - 864e5 && d <= now + 7 * 864e5; });
      return `${w.length} service(s) in the next 7 days:\n${w.map((c) => `• ${c.serviceDate} ${c.serviceTime} – ${c.number} (${c.residentName})`).join("\n")}`;
    }
    const hits = cases.filter((c) => [c.number, c.residentName, c.title, c.type, c.residentAddress].join(" ").toLowerCase().includes(l.split(" ").pop() ?? ""));
    return hits.length ? `Found ${hits.length} matching case(s): ${hits.slice(0, 8).map((c) => c.number).join(", ")}.` : "I couldn't find matching cases. Try a resident name, case number or case type.";
  };

  const send = (t: string) => {
    if (!t.trim()) return;
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setQ("");
    setTimeout(() => setMsgs((m) => [...m, { role: "ai", text: answer(t) }]), 450);
  };

  return (
    <Sheet open={aiOpen} onOpenChange={setAi}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4"><SheetTitle className="flex items-center gap-2"><Sparkles className="size-4 text-info" /> LegalFlow Assistant</SheetTitle></SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground" : "max-w-[90%] whitespace-pre-line rounded-lg bg-muted px-3 py-2 text-sm"}>{m.text}</div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 px-4">
          {suggestions.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted">{s}</button>)}
        </div>
        <form className="flex gap-2 p-4" onSubmit={(e) => { e.preventDefault(); send(q); }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about your cases…" />
          <Button type="submit" size="icon"><Send className="size-4" /></Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
