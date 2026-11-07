import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Mail, Phone, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, PageHeader, StatusBadge } from "@/components/lf/ui-bits";
import { useStore, useMe, useVisibleCases, money, fmtDate } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { clientMetrics, filterClients } from "@/lib/client-calendar";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({
    meta: [
      { title: "Clients – LegalFlow" },
      {
        name: "description",
        content: "Browse legal service clients, contacts, case volume and billing in LegalFlow.",
      },
      { property: "og:title", content: "Clients – LegalFlow" },
      { property: "og:description", content: "Client contacts, cases and billing in LegalFlow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const s = useStore();
  const me = useMe();
  const cases = useVisibleCases();
  const openClient = useUI((u) => u.openClient);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const scoped = s.clients.filter(
    (c) => cases.some((x) => x.clientId === c.id) || me?.role === "owner",
  );
  const rows = filterClients(scoped, query, status);
  const openCases = scoped.reduce((n, c) => n + clientMetrics(c, cases, s.invoices).open, 0);
  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${scoped.length} client relationships`}
        actions={
          <Button disabled={me?.role !== "owner"} onClick={() => openClient()}>
            <Plus />
            Add client
          </Button>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          [Users, "Active clients", scoped.filter((c) => c.status === "Active").length],
          [Building2, "Total customers", scoped.length],
          [Mail, "Open case files", openCases],
        ].map(([Icon, label, value]) => {
          const I = Icon as typeof Users;
          return (
            <div
              key={label as string}
              className="flex items-center gap-4 rounded-lg border bg-card p-4"
            >
              <span className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <I className="size-4" />
              </span>
              <div>
                <div className="text-[28px] font-semibold tracking-tight tabular-nums">
                  {value as number}
                </div>
                <div className="text-xs text-muted-foreground">{label as string}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="records-toolbar mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            aria-label="Search clients"
            className="pl-9"
            placeholder="Search name, company, email or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger aria-label="Client status" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["Active", "On Hold", "Inactive"].map((x) => (
              <SelectItem key={x} value={x}>
                {x}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Cases</th>
              <th className="px-4 py-3 font-medium">Billed</th>
              <th className="px-4 py-3 font-medium">Last service</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((c) => {
              const m = clientMetrics(c, cases, s.invoices);
              return (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} />
                      <div>
                        <Link
                          to="/clients/$id"
                          params={{ id: c.id }}
                          className="font-medium text-info hover:underline"
                        >
                          {c.company}
                        </Link>
                        <div className="text-xs text-muted-foreground">{c.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Mail className="size-3 text-muted-foreground" />
                      {c.email}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="size-3" />
                      {c.phone}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={c.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {m.open} open · {m.total} total
                  </td>
                  <td className="px-4 py-3 tabular-nums">{money(m.billed)}</td>
                  <td className="px-4 py-3">{fmtDate(m.lastService)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={me?.role !== "owner"}
                      onClick={() => openClient(c.id)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No clients match your search.
          </div>
        )}
      </div>
    </>
  );
}
