import { can } from "@/lib/access";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/store";
import { Button } from "@/components/ui/button";
export function PendingFileReviews() {
  const me = useMe(),
    enabled = me?.roleProfile
      ? can(me, "files.approve")
      : ["owner", "manager"].includes(me?.role || ""),
    [data, setData] = useState<any>(null),
    [offset, setOffset] = useState(0),
    [expanded, setExpanded] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const run = async () => {
      try {
        const value = await api(`/file-manager/review-queue?offset=${offset}`);
        if (active) {
          if (offset && !value.groups.length) {
            setOffset(0);
            return;
          }
          setData(value);
          setError("");
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    };
    void run();
    const timer = setInterval(() => {
      if (document.visibilityState !== "hidden") void run();
    }, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [enabled, me?.id, offset, retry]);
  if (!enabled || (!error && !data?.totalFiles)) return null;
  return (
    <section
      aria-label="Files awaiting approval"
      className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5"
    >
      <div className="mb-3 flex items-center gap-3">
        <ClipboardCheck className="size-6 text-amber-600" />
        <div>
          <h2 className="font-semibold">{data?.totalFiles || 0} files awaiting approval</h2>
          <p className="text-xs text-muted-foreground">
            Review uploaded documents and visuals before sharing them with customers.
          </p>
        </div>
        <Button variant="outline" className="ml-auto" onClick={() => setRetry((v) => v + 1)}>
          Refresh
        </Button>
      </div>
      {error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          Approval queue unavailable: {error}
        </p>
      )}
      <div className="divide-y">
        {(expanded ? data?.groups : data?.groups.slice(0, 5))?.map((g: any) => (
          <div
            key={g.caseId + g.collectionId}
            className="flex flex-wrap items-center justify-between gap-2 py-3"
          >
            <div>
              <p className="text-sm font-medium">
                {g.caseNumber} · {g.collectionName}
              </p>
              <p className="text-xs text-muted-foreground">
                {g.files} pending file{g.files === 1 ? "" : "s"}
              </p>
            </div>
            <Button asChild size="sm">
              <Link
                to="/documents"
                search={{ caseId: g.caseId, collectionId: g.collectionId, approval: "pending" }}
              >
                Review files
              </Link>
            </Button>
          </div>
        ))}
      </div>
      {data?.groups.length > 5 && (
        <Button variant="link" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show fewer" : `Show all ${data.groups.length} collections on this page`}
        </Button>
      )}
      {(data?.hasMore || offset > 0) && (
        <div className="mt-3 flex gap-3">
          <Button
            variant="outline"
            disabled={!offset}
            onClick={() => {
              setOffset((v) => Math.max(0, v - 20));
              setExpanded(false);
            }}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!data?.hasMore}
            onClick={() => {
              setOffset((v) => v + 20);
              setExpanded(false);
            }}
          >
            Next
          </Button>
        </div>
      )}
    </section>
  );
}
