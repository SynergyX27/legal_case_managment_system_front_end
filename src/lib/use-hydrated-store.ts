import { useEffect } from "react";
import { useStore } from "./store";
/** The server session determines access; business records are never persisted in the browser. */
export function useStoreHydrated() {
  const ready = useStore((s) => s.ready);
  useEffect(() => {
    if (!useStore.getState().ready) void useStore.getState().initialize();
  }, []);
  return ready;
}
