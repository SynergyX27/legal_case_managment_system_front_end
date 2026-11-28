import type { Case, Client, User } from "@/lib/domain";
import { caseAmounts } from "@/lib/case-portfolio";
import { can } from "@/lib/access";
import { money, fmtDate } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "./ui-bits";
import { VisualCollectionLink } from "./visual-collection-link";
import { FolderOpen, MapPin, CalendarDays, UserRound } from "lucide-react";
export type CaseDisplay = "table" | "card" | "list" | "board";
type Props = {
  view: Exclude<CaseDisplay, "table">;
  rows: Case[];
  clients: Client[];
  users: User[];
  me: User | null;
  selected: string[];
  onSelect: (id: string, checked: boolean) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};
export function CaseAlternateViews(p: Props) {
  const customer = p.me?.role === "customer";
  function record(c: Case) {
    const client = p.clients.find((x) => x.id === c.clientId),
      staff = p.users.find((x) => x.id === c.staffId);
    return (
      <article
        key={c.id}
        aria-label={`Case ${c.number}`}
        className={`case-display-record ${p.view === "list" ? "is-list" : ""}`}
      >
        <div className="case-display-main">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              {!customer && (
                <Checkbox
                  aria-label={`Select ${c.number}`}
                  checked={p.selected.includes(c.id)}
                  onCheckedChange={(v) => p.onSelect(c.id, !!v)}
                />
              )}
              <div className="min-w-0">
                <button
                  className="break-all text-left font-semibold text-primary hover:underline"
                  onClick={() => p.onView(c.id)}
                >
                  {c.number}
                </button>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {c.refId || c.ref || c.type || "Case file"}
                </p>
              </div>
            </div>
            <StatusBadge value={c.status} />
          </div>
          <h3 className="mt-4 break-words font-semibold">{c.residentName || c.title}</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {client?.company || client?.name || "Customer not specified"}
          </p>
          <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
            <p className="flex items-start gap-2">
              <MapPin className="size-3.5 shrink-0" />
              <span>
                {[c.community, c.residentAddress].filter(Boolean).join(" · ") ||
                  "Address not specified"}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <CalendarDays className="size-3.5" />
              {c.serviceDate ? fmtDate(c.serviceDate) : "No service date"}
              {c.serviceTime ? ` · ${c.serviceTime}` : ""}
            </p>
            <p className="flex items-center gap-2">
              <UserRound className="size-3.5" />
              {staff?.name || "Staff not specified"} · {c.priority || "Medium"} priority
            </p>
          </div>
        </div>
        <div className="case-display-side">
          {(!p.me?.roleProfile || can(p.me, "cases.financials")) && (
            <div className="mb-3 flex gap-6 text-xs">
              <div>
                <p className="text-muted-foreground">Original amount</p>
                <p className="mt-1 font-semibold">{money(caseAmounts(c).original)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount due</p>
                <p className="mt-1 font-semibold">{money(caseAmounts(c).due)}</p>
              </div>
            </div>
          )}
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Visuals</span>
            <VisualCollectionLink caseId={c.id} caseNumber={c.number} field="visLO" />
            <VisualCollectionLink caseId={c.id} caseNumber={c.number} field="visTO" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => p.onView(c.id)}>
              View case
            </Button>
            {!customer && can(p.me, "cases.edit") && (
              <Button size="sm" variant="ghost" onClick={() => p.onEdit(c.id)}>
                Edit
              </Button>
            )}
            {!customer && can(p.me, "cases.delete") && (
              <Button size="sm" variant="ghost" onClick={() => p.onDelete(c.id)}>
                Delete
              </Button>
            )}
          </div>
        </div>
      </article>
    );
  }
  if (!p.rows.length)
    return (
      <div className="p-14 text-center">
        <FolderOpen className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p>No matching case files</p>
      </div>
    );
  if (p.view === "board") {
    const statuses = [...new Set(p.rows.map((c) => c.status))];
    return (
      <div className="p-4">
        <p className="mb-4 text-xs text-muted-foreground">
          Status board · showing cases on this page. Use pagination to see more cases. Status
          changes use Edit case.
        </p>
        <div className="case-status-board">
          {statuses.map((status) => (
            <section
              className="case-board-lane"
              key={status}
              aria-label={`${status} cases on this page`}
            >
              <header className="mb-4 flex items-center justify-between">
                <StatusBadge value={status} />
                <span className="text-xs text-muted-foreground">
                  {p.rows.filter((c) => c.status === status).length} on this page
                </span>
              </header>
              <div className="space-y-3">
                {p.rows.filter((c) => c.status === status).map(record)}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={p.view === "card" ? "case-card-grid" : "case-list-grid"}>
      {p.rows.map(record)}
    </div>
  );
}
