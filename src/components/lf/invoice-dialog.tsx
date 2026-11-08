import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { invoiceTotal, money, useMe, useStore, useVisibleCases, uid } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { iso, type Invoice } from "@/lib/domain";
import { can } from "@/lib/access";
import { validateInvoice } from "@/lib/invoices";

export function InvoiceDialog() {
  const { invoiceDialog, close } = useUI();
  const s = useStore();
  const me = useMe();
  const visibleCases = useVisibleCases();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);

  const fromCase = (caseId: string): Invoice | null => {
    const c = visibleCases.find((x) => x.id === caseId);
    if (!c) return null;
    const d = new Date();
    return {
      id: uid("inv"),
      number: "Assigned on save",
      clientId: c.clientId,
      caseId: c.id,
      date: iso(d),
      dueDate: iso(new Date(d.getTime() + 30 * 864e5)),
      taxRate: 0,
      status: "Draft",
      lines: [
        {
          description: `${c.type} – service to ${c.residentName} on ${c.serviceDate}`,
          qty: 1,
          price: 0,
        },
      ],
    };
  };

  useEffect(() => {
    if (!invoiceDialog.open) return;
    if (invoiceDialog.invoiceId) {
      const existing = s.invoices.find((i) => i.id === invoiceDialog.invoiceId);
      setInv(existing ? { ...existing, lines: existing.lines.map((l) => ({ ...l })) } : null);
    } else setInv(fromCase(invoiceDialog.caseId ?? visibleCases[0]?.id ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceDialog.open, invoiceDialog.invoiceId, invoiceDialog.caseId]);

  if (!inv || !can(me, invoiceDialog.invoiceId ? "invoices.edit" : "invoices.create")) return null;
  const c = s.cases.find((x) => x.id === inv.caseId);
  const client = s.clients.find((x) => x.id === inv.clientId);
  const t = invoiceTotal(inv);
  const setLine = (i: number, k: "description" | "qty" | "price", v: string) =>
    setInv({
      ...inv,
      lines: inv.lines.map((l, j) =>
        j === i ? { ...l, [k]: k === "description" ? v : Number(v) } : l,
      ),
    });
  const save = async (status: Invoice["status"]) => {
    if (saving) return;
    const error = validateInvoice(inv, s.invoices);
    if (error) return toast.error(error);
    setSaving(true);
    try {
      if (!(await s.upsertInvoice({ ...inv, number: inv.number.trim(), status }))) return;
      toast.success(
        status === "Sent" ? "Invoice published to the customer portal" : "Invoice saved",
      );
      close();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={invoiceDialog.open} onOpenChange={(o) => !o && !saving && close()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {invoiceDialog.invoiceId ? `Edit ${inv.number}` : "Create invoice"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Related case</Label>
            <Select
              value={inv.caseId}
              onValueChange={(v) => {
                const next = fromCase(v);
                if (next)
                  setInv({
                    ...inv,
                    caseId: next.caseId,
                    clientId: next.clientId,
                    lines: next.lines,
                  });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibleCases.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.number} · {x.residentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Client</Label>
            <Input readOnly className="bg-muted" value={`${client?.name} — ${client?.company}`} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invoice-number" className="text-xs text-muted-foreground">
              Invoice #
            </Label>
            <Input
              id="invoice-number"
              readOnly
              value={inv.number}
              onChange={(e) => setInv({ ...inv, number: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invoice-date" className="text-xs text-muted-foreground">
              Invoice date
            </Label>
            <Input
              id="invoice-date"
              type="date"
              value={inv.date}
              onChange={(e) => setInv({ ...inv, date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invoice-due" className="text-xs text-muted-foreground">
              Due date
            </Label>
            <Input
              id="invoice-due"
              type="date"
              value={inv.dueDate}
              onChange={(e) => setInv({ ...inv, dueDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invoice-tax" className="text-xs text-muted-foreground">
              Tax rate (%)
            </Label>
            <Input
              id="invoice-tax"
              type="number"
              min="0"
              max="100"
              value={inv.taxRate}
              onChange={(e) => setInv({ ...inv, taxRate: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={inv.status}
              onValueChange={(v) => setInv({ ...inv, status: v as Invoice["status"] })}
            >
              <SelectTrigger aria-label="Invoice status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Draft", "Sent", "Paid", "Overdue"].map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <div className="hidden grid-cols-[1fr_70px_100px_32px] gap-2 text-xs text-muted-foreground sm:grid">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit price</span>
            <span />
          </div>
          {inv.lines.map((l, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_36px] gap-2 border-b pb-3 sm:grid-cols-[1fr_70px_100px_32px] sm:border-0 sm:pb-0"
            >
              <Input
                aria-label={`Line ${i + 1} description`}
                className="col-span-3 sm:col-span-1"
                value={l.description}
                onChange={(e) => setLine(i, "description", e.target.value)}
              />
              <Input
                aria-label={`Line ${i + 1} quantity`}
                type="number"
                min="0.01"
                step="any"
                value={l.qty}
                onChange={(e) => setLine(i, "qty", e.target.value)}
              />
              <Input
                aria-label={`Line ${i + 1} price`}
                type="number"
                min="0"
                step="0.01"
                value={l.price}
                onChange={(e) => setLine(i, "price", e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove line ${i + 1}`}
                onClick={() => setInv({ ...inv, lines: inv.lines.filter((_, j) => j !== i) })}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setInv({ ...inv, lines: [...inv.lines, { description: "", qty: 1, price: 0 }] })
            }
          >
            <Plus className="size-4" /> Add line
          </Button>
        </div>
        <div className="ml-auto w-56 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            {money(t.sub)}
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax ({inv.taxRate}%)</span>
            {money(t.tax)}
          </div>
          <div className="flex justify-between border-t pt-1 font-semibold">
            <span>Total</span>
            {money(t.total)}
          </div>
        </div>
        <DialogFooter>
          <Button disabled={saving} variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button variant="secondary" disabled={saving} onClick={() => save(inv.status)}>
            Save invoice
          </Button>
          {inv.status !== "Paid" && (
            <Button disabled={saving} onClick={() => save("Sent")}>
              Publish invoice
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
