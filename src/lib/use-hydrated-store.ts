import { useEffect, useState } from "react";
import { useStore } from "./store";

/** Rehydrates persisted demo data from localStorage after mount (avoids SSR mismatch). */
export function useStoreHydrated() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (useStore.persist.hasHydrated()) { setReady(true); return; }
    const unsub = useStore.persist.onFinishHydration(() => setReady(true));
    void useStore.persist.rehydrate();
    return unsub;
  }, []);
  return ready;
}
