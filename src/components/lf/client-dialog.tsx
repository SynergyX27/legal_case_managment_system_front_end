import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, uid } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import type { Client } from "@/lib/mock-data";

export function ClientDialog() {
  const { clientDialog, close } = useUI();
  const s = useStore();
  const [c, setC] = useState<Client | null>(null);
  useEffect(() => {
    if (!clientDialog.open) return;
    const e = clientDialog.editId ? s.clients.find((x) => x.id === clientDialog.editId) : undefined;
    setC(e ? { ...e } : { id: uid("c"), name: "", company: "", email: "", phone: "", address: "", status: "Active", accountId: s.activeAccountId !== "all" ? s.activeAccountId : s.accounts[0]?.id ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientDialog.open, clientDialog.editId]);
  if (!c) return null;
  const f = (k: keyof Client, l: string) => (
    <div className="space-y-1.5"><Label htmlFor={`client-${k}`} className="text-xs text-muted-foreground">{l}</Label><Input id={`client-${k}`} value={c[k]} onChange={(e) => setC({ ...c, [k]: e.target.value })} /></div>
  );
  return (
    <Dialog open={clientDialog.open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="font-display text-xl">{clientDialog.editId ? "Edit client" : "Add client"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {f("name", "Client name")}{f("company", "Company")}{f("email", "Email")}{f("phone", "Phone")}
          <div className="sm:col-span-2">{f("address", "Address")}</div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Account status</Label>
            <Select value={c.status} onValueChange={(v) => setC({ ...c, status: v as Client["status"] })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{["Active", "On Hold", "Inactive"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Organization</Label>
            <Select value={c.accountId} onValueChange={(v) => setC({ ...c, accountId: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{s.accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={() => { if (!c.name) return toast.error("Name is required"); s.upsertClient(c); toast.success("Client saved"); close(); }}>Save client</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
