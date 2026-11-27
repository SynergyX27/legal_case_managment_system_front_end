import { useEffect } from "react";
import { useMe, useStore } from "@/lib/store";
import { processUploads, subscribeUploads } from "@/lib/file-upload-queue";
export function FileUploadWorker() {
  const me = useMe(),
    refresh = useStore((s) => s.refresh);
  useEffect(() => {
    if (!me?.id || me.role === "customer") return;
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const done = () => {
      if (!refreshTimer)
        refreshTimer = setTimeout(() => {
          refreshTimer = undefined;
          if (active) void refresh();
        }, 5000);
    };
    const run = () => void processUploads(me.id, () => active, done).catch(() => {});
    run();
    const unsubscribe = subscribeUploads(run);
    const timer = setInterval(run, 15000);
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", run);
    return () => {
      active = false;
      unsubscribe();
      clearTimeout(refreshTimer);
      clearInterval(timer);
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", run);
    };
  }, [me?.id, me?.role, refresh]);
  return null;
}
