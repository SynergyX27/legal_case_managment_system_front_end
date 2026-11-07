import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mail, MapPin, Pencil, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useStore, useMe, useVisibleCases, fmtDate, money } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { clientMetrics } from "@/lib/client-calendar";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  head: () => ({
    meta: [
      { title: "Client detail – LegalFlow" },
      { name: "description", content: "Client detail in the LegalFlow workspace." },
      { property: "og:title", content: "Client detail – LegalFlow" },
      { property: "og:description", content: "Client detail in the LegalFlow workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const s = useStore();
  const me = useMe();
  const visible = useVisibleCases();
  const c = s.clients.find((x) => x.id === id);
  const ui = useUI();
  const nav = useNavigate();
  const [deleting, setDeleting] = useState(false);
  if (!c)
    return (
      <>
        <PageHeader title="Client not found" />
        <Link to="/clients" className="text-info hover:underline">
          Back to clients
        </Link>
      </>
    );
  const cases = visible.filter((x) => x.clientId === id);
  const m = clientMetrics(c, visible, s.invoices);
  const linked = s.cases.some((x) => x.clientId === id);
  return (
    <>
      <Link
        to="/clients"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Clients
      </Link>
      <PageHeader
        title={c.company || c.name}
        subtitle={c.name}
        actions={
          <>
            <Button
              variant="outline"
              disabled={me?.role !== "owner"}
              onClick={() => ui.openClient(id)}
            >
              <Pencil />
              Edit client
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={me?.role !== "owner"}
              aria-label="Delete client"
              title={linked ? "Client has linked case files" : "Delete client"}
              onClick={() => setDeleting(true)}
            >
              <Trash2 />
            </Button>
          </>
        }
      />
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <section className="space-y-5 lg:border-r lg:pr-6">
          <StatusBadge value={c.status} />
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="mt-1 size-4 shrink-0 text-muted-foreground" />
              <span className="break-all">{c.email || "No email"}</span>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-1 size-4 shrink-0 text-muted-foreground" />
              {c.phone || "No phone"}
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 size-4 shrink-0 text-muted-foreground" />
              {c.address || "No address"}
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground">Customer portal username</p>
            <p className="mt-1 text-sm">
              {s.users.find((u) => u.clientId === c.id)?.username || "Login access not yet created"}
            </p>
          </div>
        </section>
        <section className="min-w-0">
          <div className="mb-6 grid grid-cols-3 gap-4 border-b pb-5">
            {[
              ["Total cases", m.total],
              ["Open cases", m.open],
              ["Billed fees", money(m.billed)],
            ].map(([l, v]) => (
              <div key={l}>
                <div className="text-xs text-muted-foreground">{l}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{v}</div>
              </div>
            ))}
          </div>
          <h2 className="mb-4 font-semibold">Case files</h2>
          <div className="divide-y">
            {cases.map((x) => (
              <div key={x.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Button
                    variant="link"
                    className="h-auto p-0 text-info"
                    onClick={() => ui.openCase(x.id)}
                  >
                    {x.number}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {x.type} · {x.residentName}
                  </p>
                </div>
                <StatusBadge value={x.status} />
                <span className="text-xs text-muted-foreground">{fmtDate(x.serviceDate)}</span>
              </div>
            ))}
            {!cases.length && (
              <p className="py-8 text-sm text-muted-foreground">No case files for this client.</p>
            )}
          </div>
        </section>
      </div>
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{linked ? "Client has case files" : "Delete client?"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {linked
              ? "Keep this client’s case history intact. You can change their status to Inactive instead."
              : "This removes the client from the workspace and cannot be undone."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(false)}>
              Cancel
            </Button>
            {linked ? (
              <Button
                onClick={() => {
                  setDeleting(false);
                  ui.openClient(id);
                }}
              >
                Edit status
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!(await s.deleteClient(id))) return;
                  toast.success("Client deleted");
                  nav({ to: "/clients" });
                }}
              >
                Delete client
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
