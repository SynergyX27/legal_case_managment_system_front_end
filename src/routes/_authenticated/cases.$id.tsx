import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, StatusBadge } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe, useStore, useVisibleCases, money, fmtDate } from "@/lib/store";
import { caseBilling, totalFor } from "@/lib/billing";
import { canBill } from "@/lib/access";
import { useUI } from "@/lib/ui-store";
export const Route = createFileRoute("/_authenticated/cases/$id")({ component: Page });
function Page() {
  const { id } = Route.useParams(),
    s = useStore(),
    me = useMe(),
    cases = useVisibleCases(),
    ui = useUI();
  const [comment, setComment] = useState("");
  const c = cases.find((c) => c.id === id);
  if (!c)
    return (
      <PageHeader
        title="Case unavailable"
        subtitle="This case does not exist or is not assigned to you."
      />
    );
  const customer = me?.role === "customer",
    b = caseBilling(s.invoices, id),
    client = s.clients.find((x) => x.id === c.clientId);
  const invoices = s.invoices.filter((i) => i.caseId === id && (!customer || i.status !== "Draft"));
  const fields = [
    ["REF", c.ref],
    ["Case Number", c.number],
    ["Plaintiff", c.plaintiff],
    ["Tenant", c.residentName],
    ["Address", c.residentAddress],
    ["County", c.county],
    ["City", c.city],
    ["State", c.state],
    ["Zip", c.zip],
    ["Setout Date", fmtDate(c.serviceDate)],
    ["Setout Time", c.serviceTime],
    ["VIS - LO", c.visLO],
    ["VIS - TO", c.visTO],
    ["LOCS", c.locs],
    ["LBX", c.lbx],
  ];
  return (
    <>
      <Link to="/cases" className="mb-4 inline-block text-sm text-info">
        ← Case files
      </Link>
      <PageHeader
        title={c.number}
        subtitle={c.title}
        actions={
          <>
            {!customer && (
              <Button variant="outline" onClick={() => ui.openCase(id)}>
                Edit case
              </Button>
            )}
            {canBill(me) && (
              <Button onClick={() => ui.openInvoice({ caseId: id })}>Create invoice</Button>
            )}
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge value={c.status} />
        <StatusBadge value={c.priority} />
        <span className="text-sm text-muted-foreground">
          Customer: {client?.company || client?.name}
        </span>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-6">
            <h2 className="mb-5 font-semibold">Case & property details</h2>
            <dl className="grid gap-5 sm:grid-cols-3">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 break-words text-sm font-medium">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            {c.description && <p className="mt-6 border-t pt-4 text-sm">{c.description}</p>}
          </section>
          {(customer || canBill(me)) && (
            <section className="rounded-xl border bg-card p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-semibold">
                  Case invoices <span className="text-muted-foreground">({invoices.length})</span>
                </h2>
                <Link to="/invoices" search={{ caseId: id }} className="text-sm text-info">
                  View invoices
                </Link>
              </div>
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["Balance owed", money(b.balance)],
                  ["Paid to date", money(b.totalPaid)],
                  [
                    "Last payment",
                    b.lastPaymentDate
                      ? `${money(b.lastPayment)} · ${fmtDate(b.lastPaymentDate)}`
                      : "No payments",
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-muted/50 p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-2 font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Invoice balance only; excludes drafts. Tenant rent arrears are not tracked in this
                workspace.
              </p>
              <div className="divide-y">
                {invoices.map((i) => (
                  <Link
                    key={i.id}
                    to="/invoices"
                    search={{ caseId: id }}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-info">{i.number}</p>
                      <p className="text-xs text-muted-foreground">Due {fmtDate(i.dueDate)}</p>
                    </div>
                    <span>{money(totalFor(i))}</span>
                    <StatusBadge value={i.status} />
                  </Link>
                ))}
                {!invoices.length && (
                  <p className="py-6 text-sm text-muted-foreground">
                    No invoices yet for this case.
                  </p>
                )}
              </div>
            </section>
          )}
          {!customer && (
            <section className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 font-semibold">Internal notes & comments</h2>
              {c.comments.map((m) => (
                <div key={m.id} className="mb-3 rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="mb-1 text-xs text-muted-foreground">
                    {s.users.find((u) => u.id === m.by)?.name} · {fmtDate(m.at)}
                  </p>
                  {m.text}
                </div>
              ))}
              <form
                className="flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (comment.trim()) {
                    if (!(await s.addComment(id, comment.trim()))) return;
                    setComment("");
                  }
                }}
              >
                <Input
                  aria-label="Add internal comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add an internal comment…"
                />
                <Button type="submit">Post</Button>
              </form>
            </section>
          )}
        </div>
        <aside className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 font-semibold">Your case team</h2>
            {[c.managerId, c.staffId]
              .filter((v, i, a) => v && a.indexOf(v) === i)
              .map((uid) => {
                const u = s.users.find((x) => x.id === uid);
                return (
                  u && (
                    <div key={uid} className="mb-4">
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="mb-2 text-xs capitalize text-muted-foreground">{u.role}</p>
                      <Button
                        variant="link"
                        className="h-auto p-0 text-xs"
                        disabled={uid === me?.id}
                        onClick={() => ui.openChat(uid)}
                      >
                        Message {u.name.split(" ")[0]}
                      </Button>
                    </div>
                  )
                );
              })}
          </section>
          {!customer && (
            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-4 font-semibold">Activity timeline</h2>
              {s.activities
                .filter((a) => a.caseId === id)
                .slice(0, 12)
                .map((a) => (
                  <div key={a.id} className="mb-4 border-l-2 pl-3">
                    <p className="text-sm">{a.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.by} · {fmtDate(a.at)}
                    </p>
                  </div>
                ))}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
