import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/lf/ui-bits";
import { Button } from "@/components/ui/button";
import { MessengerPanel } from "@/components/lf/messenger";
import { useMe } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
export const Route = createFileRoute("/_authenticated/communications")({
  validateSearch: (s: Record<string, unknown>) => ({
    person: typeof s["person"] === "string" ? s["person"] : undefined,
  }),
  component: Page,
});
function Page() {
  const { person } = Route.useSearch(),
    me = useMe(),
    openChat = useUI((s) => s.openChat);
  return (
    <>
      <PageHeader
        title="Messages"
        subtitle="One place for every conversation with your case team."
        actions={
          <Button id="open-chat-popup" variant="outline" onClick={() => openChat()}>
            <MessageCircle />
            Open chat popup
          </Button>
        }
      />
      <div className="messaging-workspace">
        <MessengerPanel initialPerson={person} key={me?.id} />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Conversations are securely saved to your account and synchronize across devices.
      </p>
    </>
  );
}
