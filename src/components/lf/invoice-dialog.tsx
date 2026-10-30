import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { invoiceTotal, money, useStore, uid } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { iso, type Invoice } from "@/lib/mock-data";

export function InvoiceDialog() {
  const { invoiceDialog, close } = useUI();
  const s = useStore();
  const [inv, setInv] = useState<Invoice | null>(null);

  const fromCase = (caseId: string): Invoice => {
    const c = s.cases.find((x) => x.id === caseId)!;
    const d = new Date();
    return {
      id: uid("inv"), number: `INV-${3201 + s.invoices.length}`, clientId: c.clientId, caseId: c.id, date: iso(d),
      dueDate: iso(new Date(d.getTime() + 30 * 864e5)), taxRate: 8, status: "Draft",
      lines: [{ description: `${c.type} – service to ${c.residentName} on ${c.serviceDate}`, qty: 1, price: c.fee }],
    };
  };

  useEffect(() => {
    if (!invoiceDialog.open) return;
    if (invoiceDialog.invoiceId) setInv({ ...s.invoices.find((i) => i.id === invoiceDialog.invoiceId)! });
    else setInv(fromCase(invoiceDialog.caseId ?? s.cases[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceDialog.open]);

  if (!inv) return null;
  const c = s.cases.find((x) => x.id === inv.caseId);
  const client = s.clients.find((x) => x.id === inv.clientId);
  const t = invoiceTotal(inv);
  const setLine = (i: number, k: "description" | "qty" | "price", v: string) =>
    setInv({ ...inv, lines: inv.lines.map((l, j) => (j === i ? { ...l, [k]: k === "description" ? v : Number(v) } : l)) });

  return (
    <Dialog open={invoiceDialog.open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle className="font-display text-xl">{invoiceDialog.invoiceId ? `Edit ${inv.number}` : "Create invoice"}</DialogTitle></DialogHeader>
        {invoiceDialog.caseId && !invoiceDialog.invoiceId && (
          <div className="rounded-md border border-info/20 bg-info/5 px-3 py-2 text-xs text-info">Auto-filled from case {c?.number}: client, service details and fee. Review before saving.</div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Related case</Label>
            <Select value={inv.caseId} onValueChange={(v) => setInv({ ...fromCase(v), id: inv.id, number: inv.number })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{s.cases.map((x) => <SelectItem key={x.id} value={x.id}>{x.number} · {x.residentName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Client</Label><Input readOnly className="bg-muted" value={`${client?.name} — ${client?.company}`} /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Invoice #</Label><Input value={inv.number} onChange={(e) => setInv({ ...inv, number: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Invoice date</Label><Input type="date" value={inv.date} onChange={(e) => setInv({ ...inv, date: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Due date</Label><Input type="date" value={inv.dueDate} onChange={(e) => setInv({ ...inv, dueDate: e.target.value })} /></div>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_70px_100px_32px] gap-2 text-xs text-muted-foreground"><span>Description</span><span>Qty</span><span>Unit price</span><span /></div>
          {inv.lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_70px_100px_32px] gap-2">
              <Input value={l.description} onChange={(e) => setLine(i, "description", e.target.value)} />
              <Input type="number" value={l.qty} onChange={(e) => setLine(i, "qty", e.target.value)} />
              <Input type="number" value={l.price} onChange={(e) => setLine(i, "price", e.target.value)} />
              <Button variant="ghost" size="icon" onClick={() => setInv({ ...inv, lines: inv.lines.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setInv({ ...inv, lines: [...inv.lines, { description: "", qty: 1, price: 0 }] })}><Plus className="size-4" /> Add line</Button>
        </div>
        <div className="ml-auto w-56 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span>{money(t.sub)}</div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax ({inv.taxRate}%)</span>{money(t.tax)}</div>
          <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span>{money(t.total)}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button variant="secondary" onClick={() => { s.upsertInvoice(inv); toast.success("Saved as draft"); close(); }}>Save draft</Button>
          <Button onClick={() => { s.upsertInvoice({ ...inv, status: inv.status === "Draft" ? "Sent" : inv.status }); toast.success(`Invoice ${inv.number} sent to ${client?.email}`); close(); }}>Save & send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
