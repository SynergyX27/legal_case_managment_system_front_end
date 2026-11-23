import {useSyncExternalStore} from 'react';
export type CaseViewLayout = 'stacked' | 'side-by-side';
const eventName='legalflow:case-view-layout';
const fallback=new Map<string,CaseViewLayout>();
const key=(userId:string)=>`legalflow.case-view-layout.${userId}`;
export function readCaseViewLayout(userId:string):CaseViewLayout {
  if(fallback.has(userId)) return fallback.get(userId)!;
  try {return localStorage.getItem(key(userId))==='side-by-side'?'side-by-side':'stacked';} catch {return 'stacked';}
}
function subscribe(callback:()=>void) {
  window.addEventListener('storage',callback);
  window.addEventListener(eventName,callback);
  return ()=>{window.removeEventListener('storage',callback);window.removeEventListener(eventName,callback);};
}
export function useCaseViewLayout(userId:string) {
  const layout=useSyncExternalStore(subscribe,()=>readCaseViewLayout(userId),()=> 'stacked' as CaseViewLayout);
  const setLayout=(value:CaseViewLayout)=>{
    try {localStorage.setItem(key(userId),value);fallback.delete(userId);} catch {fallback.set(userId,value);}
    window.dispatchEvent(new Event(eventName));
  };
  return [layout,setLayout] as const;
}
