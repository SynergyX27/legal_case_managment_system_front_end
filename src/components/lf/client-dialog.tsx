import { OwnerUserForm } from "./user-editor";
import { COMPANY_ID } from "@/lib/company";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { useStore, useMe, uid } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import type { Client } from "@/lib/domain";

export function ClientDialog() {
  const { clientDialog, close } = useUI();
  const s = useStore();
  const me = useMe();
  const [c, setC] = useState<Client | null>(null);
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  useEffect(() => {
    if (!clientDialog.open) return;
    const e = clientDialog.editId ? s.clients.find((x) => x.id === clientDialog.editId) : undefined;
    setUsername(s.users.find(u => u.id===e?.primaryUserId)?.username || "");
    setPassword("");
    setC(
      e
        ? { ...e }
        : {
            id: uid("c"),
            name: "",
            company: "",
            email: "",
            phone: "",
            address: "",
            status: "Active",
            accountId: COMPANY_ID,
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientDialog.open, clientDialog.editId]);
  if (!c || me?.role !== "owner") return null;
  if (!clientDialog.editId)
    return (
      <Dialog open={clientDialog.open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add customer & login</DialogTitle>
          </DialogHeader>
          <OwnerUserForm defaultRole="customer" allowRoleSelection={false} onSaved={close} />
        </DialogContent>
      </Dialog>
    );
  const f = (k: keyof Client, l: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`client-${k}`} className="text-xs text-muted-foreground">
        {l}
      </Label>
      <Input
        id={`client-${k}`}
        value={c[k]}
        onChange={(e) => setC({ ...c, [k]: e.target.value })}
      />
    </div>
  );
  return (
    <Dialog open={clientDialog.open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {clientDialog.editId ? "Edit customer & access" : "Add customer"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {f("name", "Customer name")}
          {f("email", "Email")}
          {f("phone", "Phone")}
          <div className="sm:col-span-2">{f("address", "Address")}</div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Account status</Label>
            <Select
              value={c.status}
              onValueChange={(v) => setC({ ...c, status: v as Client["status"] })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Active", "On Hold", "Inactive"].map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="customer-username">Username</Label><Input id="customer-username" value={username} onChange={e=>setUsername(e.target.value)} autoComplete="off" /></div>
          <div><Label htmlFor="customer-password">{c.primaryUserId ? "New password (optional)" : "Password (required)"}</Label><Input id="customer-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" /></div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Customer details and main sign-in access are saved together. Extra regional/community logins are managed from Workspaces.</p>
        <DialogFooter>
          <Button variant="destructive" disabled={busy} onClick={async()=>{
            if(!confirm("Delete this customer and their main login? Cases, invoices, workspaces and additional logins must be removed first."))return;
            setBusy(true);try {if(await s.deleteClient(c.id)){toast.success("Customer deleted");close();}}finally{setBusy(false);}
          }}>Delete customer</Button>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button disabled={busy}
            onClick={async () => {
              if (!c.name) return toast.error("Name is required");
              if(!username.trim()) return toast.error("Username is required");
              if(!c.primaryUserId && !password) return toast.error("Password is required to complete access");
              setBusy(true);
              try { if (!(await s.upsertClient({...c, username, password:password || undefined} as Client))) return; }
              finally {setBusy(false);}
              toast.success("Client saved");
              close();
            }}
          >
            Save customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
