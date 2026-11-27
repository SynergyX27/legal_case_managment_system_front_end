import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import type {ComponentType} from 'react';
import {useStore} from '@/lib/store';
vi.mock('@tanstack/react-router',()=>({createFileRoute:()=>(options:any)=>({options,useParams:()=>({id:'view-case'})}),Link:({children}:any)=><a>{children}</a>}));
vi.mock('@/components/lf/single-case-report',()=>({SingleCaseReport:()=>null}));
vi.mock('@/components/lf/file-manager',()=>({FileManager:({caseId}:any)=><section aria-label="Case File Manager">File Manager for {caseId}</section>}));
vi.mock('@/components/lf/workspace-assignment',()=>({WorkspaceAssignment:()=>null}));
import {Route} from '@/routes/_authenticated/cases.$id';
const Page=Route.options.component as ComponentType;
beforeEach(()=>{
 localStorage.clear();
 useStore.setState({sessionUserId:'owner',users:[{id:'owner',name:'Owner',role:'owner',status:'Active'}] as any,clients:[{id:'customer',name:'Customer'}] as any,cases:[{id:'view-case',number:'VIEW-001',title:'Test case',clientId:'customer',status:'Pending',priority:'Medium',moneyOwed:1500,paidInvoiceTotal:500,attachments:[{id:'file',name:'Proof.pdf',type:'pdf',size:'2 KB',uploadedAt:'2026-11-23',url:'/api/documents/file'}],comments:[]}] as any,invoices:[],activities:[]});
});
afterEach(cleanup);
it('switches the case-view section layout, retains documents and remembers the view independently of forms',()=>{
 localStorage.setItem('legalflow.case-form-layout.owner','columns');
 const view=render(<Page/>);
 expect(screen.getByRole('radio',{name:'Stacked'})).toHaveAttribute('aria-checked','true');
 fireEvent.click(screen.getByRole('radio',{name:'Side-by-side'}));
 expect(document.querySelector('.case-details-panel')).toHaveAttribute('data-view-layout','side-by-side');
 expect(Array.from(document.querySelectorAll('.case-detail-section')).map(n=>n.getAttribute('data-section'))).toEqual(['case','property','financials','data']);
 expect(screen.getByRole('region',{name:'Case File Manager'})).toHaveTextContent('view-case');
 expect(localStorage.getItem('legalflow.case-form-layout.owner')).toBe('columns');
 view.unmount();render(<Page/>);
 expect(screen.getByRole('radio',{name:'Side-by-side'})).toHaveAttribute('aria-checked','true');
 fireEvent.click(screen.getByRole('radio',{name:'Stacked'}));
 expect(screen.getAllByText('VIEW-001').length).toBeGreaterThan(0);
});
