import { Eye } from "lucide-react";
import { useMe } from "@/lib/store";
import { can } from "@/lib/access";
import { visualCollection, visualCollectionHref } from "@/lib/visual-collections";
export function VisualCollectionLink({
  caseId,
  caseNumber,
  field,
}: {
  caseId: string;
  caseNumber?: string;
  field: string;
}) {
  const me = useMe(),
    collection = visualCollection(field),
    href = visualCollectionHref(caseId, field);
  if (
    !collection ||
    !href ||
    !me ||
    me.status !== "Active" ||
    !(me.role === "customer" || can(me, "files.view"))
  )
    return null;
  return (
    <a
      href={href}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Open ${collection.label} for ${caseNumber || caseId}`}
      title={`${collection.description} · Open collection`}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-primary hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Eye className="size-4" />
    </a>
  );
}
