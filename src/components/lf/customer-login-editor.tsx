import {useState} from 'react';
import {useStore} from '@/lib/store';
import type {User} from '@/lib/domain';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {ModernSelect} from '@/components/ui/modern-select';
import {api} from '@/lib/api';
import {toast} from 'sonner';
export function CustomerLoginEditor({user,onSaved}:{user:User;onSaved:()=>void}) {
 const s=useStore(); const [email,setEmail]=useState(user.email),[phone,setPhone]=useState(user.phone||''),[password,setPassword]=useState(''),[status,setStatus]=useState(user.status),[busy,setBusy]=useState(false);
 const main=s.clients.some(c=>c.primaryUserId===user.id);
 return <div className="space-y-3"><p className="text-sm">{main?'Main customer login - edit customer details from Customers.':'Extra workspace login'} · {user.username}</p>
 {main ? <Button onClick={onSaved}>Close</Button> : <>
 <Label>Email</Label><Input value={email} type="email" onChange={e=>setEmail(e.target.value)}/>
 <Label>Phone</Label><Input value={phone} onChange={e=>setPhone(e.target.value)}/>
 <Label>New password (optional)</Label><Input type="password" value={password} onChange={e=>setPassword(e.target.value)}/>
 <ModernSelect aria-label="Login status" value={status} onChange={e=>setStatus(e.target.value as User['status'])}><option>Active</option><option>Inactive</option></ModernSelect>
 <Button disabled={busy} onClick={async()=>{setBusy(true);try {const error=await s.updateUserAccess(user.id,{role:'customer',status,email,phone,password:password||undefined,updatedAt:user.updatedAt});if(error)toast.error(error);else onSaved();}finally{setBusy(false);}}}>Save login</Button>
 <Button variant="destructive" disabled={busy} onClick={async()=>{if(!confirm('Delete this extra customer login? Assigned cases will block deletion.'))return;setBusy(true);try {await api(`/users/${user.id}`,{method:'DELETE',body:{updatedAt:user.updatedAt}});await s.refresh();onSaved();}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}}}>Delete extra login</Button>
 </>}
 </div>;
}
