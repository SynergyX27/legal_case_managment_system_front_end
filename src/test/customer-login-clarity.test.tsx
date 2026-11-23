import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import type {ComponentType} from 'react';
import {useStore} from '@/lib/store';
import {useUI} from '@/lib/ui-store';
import {ClientDialog} from '@/components/lf/client-dialog';
vi.mock('@tanstack/react-router', () => ({createFileRoute: () => (options:any) => ({options}), Link: ({children}:any) => <a>{children}</a>}));
import {Route} from '@/routes/_authenticated/clients.index';
const Page=Route.options.component as ComponentType;
const save=vi.fn(async (_input:any) => true);
beforeEach(() => {
 save.mockClear();useUI.setState({clientDialog:{open:false}});
 useStore.setState({sessionUserId:'owner',users:[{id:'owner',role:'owner',name:'Owner',status:'Active'},{id:'main',role:'customer',clientId:'linked',name:'Customer',username:'existing-main',status:'Active'}] as any,clients:[{id:'empty',name:'Legacy customer',company:'Legacy customer',email:'legacy@example.com',phone:'123',address:'Test street',status:'Active'},{id:'linked',primaryUserId:'main',name:'Linked customer',company:'Linked customer',email:'linked@example.com',status:'Active'}] as any,cases:[],invoices:[],upsertClient:save});
});
afterEach(cleanup);
it('shows main access within customers without a separate Add login flow', () => {
 render(<Page/>);expect(screen.getByText('Access ready')).toBeInTheDocument();expect(screen.getByText('Complete access')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Add login'})).not.toBeInTheDocument();
});
it('completes an existing customer main login through the customer edit form', async () => {
 useUI.setState({clientDialog:{open:true,editId:'empty'}});render(<ClientDialog/>);
 fireEvent.change(screen.getByLabelText('Username'),{target:{value:'legacy-main'}});
 fireEvent.change(screen.getByLabelText('Password (required)'),{target:{value:'Long-password-123'}});
 fireEvent.click(screen.getByRole('button',{name:'Save customer'}));
 await waitFor(()=>expect(save).toHaveBeenCalled());
 expect(save.mock.calls[0][0]).toMatchObject({id:'empty',username:'legacy-main',password:'Long-password-123'});
});
