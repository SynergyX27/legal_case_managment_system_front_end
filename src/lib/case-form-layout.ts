import {useSyncExternalStore} from 'react';
export type CaseFormLayout = 'vertical' | 'columns';
const eventName='legalflow:case-form-layout';
const fallback=new Map<string,CaseFormLayout>();
const key=(userId:string)=>`legalflow.case-form-layout.${userId}`;
export function readCaseLayout(userId:string):CaseFormLayout {
  if(fallback.has(userId)) return fallback.get(userId)!;
  try {return localStorage.getItem(key(userId))==='columns'?'columns':'vertical';} catch {return 'vertical';}
}
function subscribe(callback:()=>void) {
  window.addEventListener('storage',callback);
  window.addEventListener(eventName,callback);
  return ()=>{window.removeEventListener('storage',callback);window.removeEventListener(eventName,callback);};
}
export function useCaseFormLayout(userId:string) {
  const layout=useSyncExternalStore(subscribe,()=>readCaseLayout(userId),()=> 'vertical' as CaseFormLayout);
  const setLayout=(value:CaseFormLayout)=>{
    try {localStorage.setItem(key(userId),value);fallback.delete(userId);} catch {fallback.set(userId,value);}
    window.dispatchEvent(new Event(eventName));
  };
  return [layout,setLayout] as const;
}
