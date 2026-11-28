import {it,expect,afterEach} from 'vitest';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {VisualCollectionLink} from '../components/lf/visual-collection-link';
import {useStore} from '../lib/store';
import {visualCollectionHref} from '../lib/visual-collections';
afterEach(cleanup);
it('opens the correct case collection without a camera action even when its field is empty',()=>{
 useStore.setState({sessionUserId:'owner',users:[{id:'owner',role:'owner',status:'Active'}] as any});
 const view=render(<VisualCollectionLink caseId="case-one" caseNumber="LF-001" field="visLO"/>);
 expect(screen.getByRole('link',{name:'Open VIS - LO for LF-001'})).toHaveAttribute('href','/documents?caseId=case-one&collectionId=vis-lo');
 view.rerender(<VisualCollectionLink caseId="case-two" field="VIS - TO"/>);
 expect(screen.getByRole('link')).toHaveAttribute('href','/documents?caseId=case-two&collectionId=vis-to');
 expect(visualCollectionHref('case-three','visRI')).toBe('/documents?caseId=case-three&collectionId=vis-ri');
 expect(visualCollectionHref('case-three','notes')).toBeUndefined();
});
it('hides links for users without file permission and keeps assigned-customer links available',()=>{
 useStore.setState({sessionUserId:'staff',users:[{id:'staff',role:'staff',status:'Active',permissions:{'files.view':false}}] as any});
 const view=render(<VisualCollectionLink caseId="case-one" field="visLO"/>);
 expect(screen.queryByRole('link')).not.toBeInTheDocument();
 useStore.setState({sessionUserId:'customer',users:[{id:'customer',role:'customer',status:'Active'}] as any});
 view.rerender(<VisualCollectionLink caseId="case-one" field="visLO"/>);
 expect(screen.getByRole('link')).toBeInTheDocument();
});
it('does not trigger the case row click handler',()=>{
 useStore.setState({sessionUserId:'owner',users:[{id:'owner',role:'owner',status:'Active'}] as any});let clicked=false;
 render(<div onClick={()=>{clicked=true;}}><VisualCollectionLink caseId="case-one" field="visLO"/></div>);
 const link=screen.getByRole('link');link.addEventListener('click',e=>e.preventDefault());fireEvent.click(link);expect(clicked).toBe(false);
});
