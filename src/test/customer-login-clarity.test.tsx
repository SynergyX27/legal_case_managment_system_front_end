import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import type {ComponentType} from 'react';
import {useStore} from '@/lib/store';
vi.mock('@tanstack/react-router', () => ({createFileRoute: () => (options:any) => ({options}), Link: ({children}:any) => <a>{children}</a>}));
import {Route} from '@/routes/_authenticated/clients.index';
const Page=Route.options.component as ComponentType;
const create=vi.fn(async (_input:any) => '');
beforeEach(() => {
 create.mockClear();
 useStore.setState({sessionUserId:'owner',users:[{id:'owner',role:'owner',name:'Owner',status:'Active'}, {id:'a',name:'First login',role:'customer',clientId:'linked',status:'Active'}, {id:'b',name:'Second login',role:'customer',clientId:'linked',status:'Inactive'}] as any,clients:[{id:'empty',name:'No account customer',company:'No account customer',email:'new@example.com',phone:'123',address:'Test street',status:'Active'},{id:'linked',name:'Linked customer',company:'Linked customer',email:'linked@example.com',status:'Active'}] as any,cases:[],invoices:[],createUser:create});
});
afterEach(cleanup);
it('distinguishes profiles with no login from multiple active/inactive logins', () => {
 render(<Page/>);
 expect(screen.getByText('No login')).toBeInTheDocument();
 expect(screen.getByText('2 logins')).toBeInTheDocument();
 expect(screen.getByText('1 active · 1 inactive')).toBeInTheDocument();
 expect(screen.getAllByRole('button',{name:'Add login'})).toHaveLength(1);
});
it('adds a login linked to the existing profile rather than a duplicate customer', async () => {
 render(<Page/>);fireEvent.click(screen.getByRole('button',{name:'Add login'}));
 expect(screen.getByLabelText('Full name')).toHaveValue('No account customer');
 fireEvent.change(screen.getByLabelText('Username'),{target:{value:'new-login'}});
 fireEvent.change(screen.getByLabelText('Password',{exact:true}),{target:{value:'Long-password-123'}});
 fireEvent.change(screen.getByLabelText('Confirm password'),{target:{value:'Long-password-123'}});
 fireEvent.click(screen.getByRole('button',{name:'Create login'}));
 await waitFor(()=>expect(create).toHaveBeenCalled());
 expect(create.mock.calls[0][0]).toMatchObject({clientId:'empty',role:'customer',email:'new@example.com'});
});
