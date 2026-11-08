import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Receipt,
  Send,
  Trash2,
} from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  canAccess,
  fmtDate,
  invoiceTotal,
  money,
  useMe,
  useStore,
  useVisibleCases,
} from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { Link, useSearch } from "@tanstack/react-router";
import { can } from "@/lib/access";
import { filterInvoices, invoiceSummary } from "@/lib/invoices";
import type { Invoice } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices – LegalFlow" },
      {
        name: "description",
        content:
          "Manage legal service invoices, billing totals and recorded payments in LegalFlow.",
      },
      { property: "og:title", content: "Invoices – LegalFlow" },
      {
        property: "og:description",
        content: "Legal service invoices and billing totals in LegalFlow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { caseId?: string; payment?: string; invoiceId?: string } => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
    payment: ["success", "cancelled"].includes(String(search["payment"]))
      ? String(search["payment"])
      : undefined,
    invoiceId: typeof search["invoiceId"] === "string" ? search["invoiceId"] : undefined,
  }),
  component: Page,
});

function Page() {
  const s = useStore();
  const me = useMe();
  const cases = useVisibleCases();
  const bill = can(me, "invoices.edit");
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const searchParams = useSearch({ strict: false }) as {
    caseId?: string;
    payment?: string;
    invoiceId?: string;
  };
  const openInvoice = useUI((u) => u.openInvoice);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [clientId, setClientId] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [paidId, setPaidId] = useState<string | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<{
    enabled: boolean;
    testMode: boolean;
  } | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  useEffect(() => {
    let cancelled = false;
    void api("/payments/config")
      .then((value) => {
        if (!cancelled) setPaymentConfig(value);
      })
      .catch(() => {
        if (!cancelled) setPaymentConfig({ enabled: false, testMode: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!searchParams.payment) return;
    if (searchParams.payment === "cancelled") {
      setPaymentMessage("Checkout was closed. If the invoice is still unpaid, you can try again.");
      return;
    }
    if (!searchParams.invoiceId) return;
    let cancelled = false;
    setPaymentMessage("Checking your payment with Stripe…");
    void api<{ status: string }>(
      `/invoices/${encodeURIComponent(searchParams.invoiceId)}/payment-status`,
      { method: "POST" },
    )
      .then(async (result) => {
        if (cancelled) return;
        await s.refresh();
        if (!cancelled)
          setPaymentMessage(
            result.status === "Paid"
              ? "Payment confirmed. Your invoice is paid."
              : "Your payment has not been confirmed yet. This page will update when Stripe confirms it.",
          );
      })
      .catch((error) => {
        if (!cancelled) setPaymentMessage(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams.payment, searchParams.invoiceId, s.refresh]);
  const payOnline = async (invoice: Invoice) => {
    if (payingId) return;
    setPayingId(invoice.id);
    try {
      const result = await api<{ url?: string; paid?: boolean }>(
        `/invoices/${invoice.id}/checkout`,
        { method: "POST" },
      );
      if (result.paid) {
        await s.refresh();
        toast.success("Payment confirmed. Invoice paid.");
        return;
      }
      if (result.url) {
        const url = new URL(result.url);
        if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
          throw new Error("Unexpected checkout address");
        window.location.assign(url.href);
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPayingId(null);
    }
  };

  const invoices = s.invoices.filter(
    (i) =>
      cases.some((c) => c.id === i.caseId) && (me?.role !== "customer" || i.status !== "Draft"),
  );
  const rows = filterInvoices(
    searchParams.caseId ? invoices.filter((i) => i.caseId === searchParams.caseId) : invoices,
    s.clients,
    query,
    status,
    clientId,
  ).sort((a, b) => b.date.localeCompare(a.date));
  const summary = invoiceSummary(invoices);
  const preview = invoices.find((i) => i.id === previewId);
  const paidInvoice = invoices.find((i) => i.id === paidId);
  const change = async (invoice: Invoice, next: Invoice["status"]) => {
    if (!(await s.upsertInvoice({ ...invoice, status: next }))) return;
    toast.success(
      next === "Sent" ? "Invoice published to the customer portal" : "Payment recorded",
    );
  };
  const exportCsv = () => {
    const quote = (v: string | number) =>
      `"${String(v)
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""')}"`;
    const csv = [
      ["Invoice", "Client", "Date", "Due date", "Status", "Subtotal", "Tax", "Total"],
      ...rows.map((i) => {
        const t = invoiceTotal(i);
        return [
          i.number,
          s.clients.find((c) => c.id === i.clientId)?.company ?? "",
          i.date,
          i.dueDate,
          i.status,
          t.sub.toFixed(2),
          t.tax.toFixed(2),
          t.total.toFixed(2),
        ];
      }),
    ]
      .map((r) => r.map(quote).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "legalflow-invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  if (!canAccess(me, "invoices"))
    return (
      <PageHeader
        title="Invoices"
        subtitle="Your owner has not enabled invoice access for your account."
      />
    );
  return (
    <>
      <Dialog
        open={!!deleting}
        onOpenChange={(o) => {
          if (!o && !deleteBusy) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleting?.number}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This removes the invoice from the case and customer portal. Paid invoices and invoices
            with an active checkout or payment processing cannot be deleted. Payment history is
            retained.
          </p>
          <DialogFooter>
            <Button variant="outline" disabled={deleteBusy} onClick={() => setDeleting(null)}>
              Keep invoice
            </Button>
            <Button
              variant="destructive"
              disabled={deleteBusy}
              onClick={async () => {
                if (!deleting) return;
                setDeleteBusy(true);
                try {
                  if (await s.deleteInvoice(deleting.id, deleting.updatedAt)) {
                    setDeleting(null);
                    toast.success("Invoice deleted");
                  }
                } finally {
                  setDeleteBusy(false);
                }
              }}
            >
              {deleteBusy ? "Deleting…" : "Delete invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {paymentMessage && (
        <p role="status" className="mb-4 rounded-xl border bg-accent p-4 text-sm">
          {searchParams.payment === "success" &&
          s.invoices.some((i) => i.id === searchParams.invoiceId && i.status === "Paid")
            ? "Payment confirmed. Your invoice is paid."
            : paymentMessage}
        </p>
      )}
      {me?.role === "customer" && paymentConfig && !paymentConfig.enabled && (
        <p className="mb-4 rounded-xl border p-4 text-sm text-muted-foreground">
          Online payments are not enabled yet. Please contact your case team.
        </p>
      )}
      {me?.role === "customer" && paymentConfig?.enabled && paymentConfig.testMode && (
        <p className="mb-4 rounded-xl border p-4 text-sm text-muted-foreground">
          Test payments: use Stripe test card details. No real money will be charged.
        </p>
      )}
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} invoices · Billing and online payments`}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download />
              Export
            </Button>
            {can(me, "invoices.create") && (
              <Button disabled={!cases.length} onClick={() => openInvoice()}>
                <Plus />
                Create invoice
              </Button>
            )}
          </>
        }
      />
      {searchParams.caseId && (
        <div className="mb-4 flex items-center justify-between rounded-lg border bg-accent/40 p-3 text-sm">
          <span>
            Invoices for{" "}
            {cases.find((c) => c.id === searchParams.caseId)?.number ?? "selected case"}
          </span>
          <Link to="/invoices" search={{ caseId: undefined }} className="text-info">
            Show all invoices
          </Link>
        </div>
      )}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Collected",
            value: summary.paid,
            Icon: Check,
            tone: "text-success bg-success/10",
          },
          {
            label: "Outstanding",
            value: summary.outstanding,
            Icon: Receipt,
            tone: "text-info bg-info/10",
          },
          {
            label: "Overdue",
            value: summary.overdue,
            Icon: Clock,
            tone: "text-destructive bg-destructive/10",
          },
          {
            label: "Draft value",
            value: summary.draft,
            Icon: FileText,
            tone: "text-primary bg-accent",
          },
        ].map(({ label, value, Icon, tone }) => (
          <div key={label} className="metric-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className={`flex size-8 items-center justify-center rounded-md ${tone}`}>
                <Icon className="size-4" />
              </span>
            </div>
            <div className="mt-3 text-[28px] font-semibold tracking-tight tabular-nums">
              {money(value)}
            </div>
          </div>
        ))}
      </div>
      <div className="case-views mb-4 flex flex-wrap gap-1">
        {["", "Draft", "Sent", "Paid", "Overdue"].map((v) => (
          <Button
            key={v}
            variant={status === v ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatus(v)}
          >
            {v || "All invoices"}
            <span className="text-xs text-muted-foreground">
              {invoices.filter((i) => !v || i.status === v).length}
            </span>
          </Button>
        ))}
      </div>
      <div className="records-toolbar mb-4 flex flex-wrap gap-2">
        <Input
          aria-label="Search invoices"
          className="w-full sm:max-w-sm"
          placeholder="Search invoice number, client or service…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select value={clientId || "all"} onValueChange={(v) => setClientId(v === "all" ? "" : v)}>
          <SelectTrigger aria-label="Invoice client" className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {s.clients
              .filter((c) => invoices.some((i) => i.clientId === c.id))
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.company}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
            <tr>
              {["Invoice", "Client", "Issued", "Due date", "Amount", "Status", "Actions"].map(
                (h) => (
                  <th key={h} className="px-4 py-3 font-medium">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3">
                  <Button
                    variant="link"
                    className="h-auto p-0 text-info"
                    onClick={() => setPreviewId(i.id)}
                  >
                    {i.number}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {cases.find((c) => c.id === i.caseId)?.number}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {s.clients.find((c) => c.id === i.clientId)?.company}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.clients.find((c) => c.id === i.clientId)?.name}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">{fmtDate(i.date)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">{fmtDate(i.dueDate)}</td>
                <td className="px-4 py-3 font-medium tabular-nums">
                  {money(invoiceTotal(i).total)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge value={i.status} />
                  {i.paymentMethod === "stripe" && (
                    <p className="mt-1 text-xs text-muted-foreground">Paid online · Stripe</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Preview ${i.number}`}
                      title="Preview invoice"
                      onClick={() => setPreviewId(i.id)}
                    >
                      <Eye className="size-4" />
                    </Button>
                    {me?.role === "customer" && ["Sent", "Overdue"].includes(i.status) && (
                      <Button
                        size="sm"
                        className="ml-2"
                        disabled={!paymentConfig?.enabled || !!payingId}
                        onClick={() => payOnline(i)}
                      >
                        {payingId === i.id ? "Opening…" : "Pay online"}
                      </Button>
                    )}
                    {can(me, "invoices.delete") && i.status !== "Paid" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${i.number}`}
                        title="Delete invoice"
                        onClick={() => setDeleting(i)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                    {bill && (
                      <>
                        <Button
                          disabled={i.paymentMethod === "stripe" || i.status === "Paid"}
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${i.number}`}
                          title="Edit invoice"
                          onClick={() => openInvoice({ invoiceId: i.id })}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        {i.status === "Draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Mark ${i.number} sent`}
                            title="Publish invoice"
                            onClick={() => change(i, "Sent")}
                          >
                            <Send className="size-4" />
                          </Button>
                        )}
                        {["Sent", "Overdue"].includes(i.status) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Mark ${i.number} paid`}
                            title="Record payment"
                            onClick={() => setPaidId(i.id)}
                          >
                            <Check className="size-4 text-success" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="py-14 text-center">
            <Receipt className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No invoices match your filters.</p>
            <Button
              variant="link"
              onClick={() => {
                setQuery("");
                setStatus("");
                setClientId("");
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{rows.length} invoices</p>
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreviewId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice {preview?.number}</DialogTitle>
          </DialogHeader>
          {preview && (
            <>
              <div className="flex flex-wrap justify-between gap-4 border-b pb-4">
                <div>
                  <div className="font-display text-xl font-semibold">LegalFlow</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cases.find((c) => c.id === preview.caseId)?.number}
                  </p>
                </div>
                <StatusBadge value={preview.status} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Bill to</p>
                  <p className="mt-1 font-medium">
                    {s.clients.find((c) => c.id === preview.clientId)?.company}
                  </p>
                  <p className="text-sm">
                    {s.clients.find((c) => c.id === preview.clientId)?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.clients.find((c) => c.id === preview.clientId)?.email}
                  </p>
                </div>
                <div className="text-sm">
                  <p>Issued: {fmtDate(preview.date)}</p>
                  <p>Due: {fmtDate(preview.dueDate)}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-96 text-left text-sm">
                  <thead className="border-b text-xs text-muted-foreground">
                    <tr>
                      <th className="py-2">Description</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.lines.map((l, n) => (
                      <tr key={n}>
                        <td className="py-3 pr-4">{l.description}</td>
                        <td className="pr-4">{l.qty}</td>
                        <td className="pr-4">{money(l.price)}</td>
                        <td className="text-right">{money(l.qty * l.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ml-auto w-56 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  {money(invoiceTotal(preview).sub)}
                </div>
                <div className="flex justify-between">
                  <span>Tax ({preview.taxRate}%)</span>
                  {money(invoiceTotal(preview).tax)}
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total</span>
                  {money(invoiceTotal(preview).total)}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewId(null)}>
                  Close
                </Button>
                {me?.role === "customer" && ["Sent", "Overdue"].includes(preview.status) && (
                  <Button
                    disabled={!paymentConfig?.enabled || !!payingId}
                    onClick={() => payOnline(preview)}
                  >
                    {payingId === preview.id
                      ? "Opening checkout…"
                      : `Pay ${money(invoiceTotal(preview).total)} online`}
                  </Button>
                )}
                {bill && preview.paymentMethod !== "stripe" && preview.status !== "Paid" && (
                  <Button
                    onClick={() => {
                      setPreviewId(null);
                      openInvoice({ invoiceId: preview.id });
                    }}
                  >
                    <Pencil />
                    Edit invoice
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!paidInvoice} onOpenChange={(o) => !o && setPaidId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark invoice as paid?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Record {paidInvoice ? money(invoiceTotal(paidInvoice).total) : ""} as paid for{" "}
            {paidInvoice?.number}. This records a payment you have already received.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidId(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (paidInvoice) await change(paidInvoice, "Paid");
                setPaidId(null);
              }}
            >
              Confirm paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
