import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { useUI } from "@/lib/ui-store";
export const Route = createFileRoute("/_authenticated/ai-insights")({ component: Page });
function Page() {
  const openChat = useUI((s) => s.openChat);
  return (
    <>
      <PageHeader
        title="AI insights"
        subtitle="This area remains outside the current prototype workflow."
      />
      <section className="overview-card flex min-h-[420px] flex-col items-center justify-center !bg-[#fbfdfb] text-center">
        <div className="mb-6 flex size-20 items-center justify-center rounded-[24px] border border-primary/10 bg-accent">
          <Sparkles className="size-8 text-primary" />
        </div>
        <span className="mb-3 rounded-full border bg-card px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Planned workspace area
        </span>
        <h2 className="!text-2xl">A home for ai insights.</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          This section is planned for a later development step. Your case files, invoices and
          conversations are ready to explore.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => openChat()}>
          Connect with your team <ArrowUpRight />
        </Button>
      </section>
    </>
  );
}
