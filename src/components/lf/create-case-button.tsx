import { useNavigate } from "@tanstack/react-router";
import { Plus, ChevronDown, PanelsTopLeft, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { can } from "@/lib/access";
import { useMe } from "@/lib/store";
import { useUI } from "@/lib/ui-store";

export function CreateCaseButton({
  label = "New case",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const me = useMe();
  const navigate = useNavigate();
  const openCase = useUI((s) => s.openCase);
  if (!can(me, "cases.create")) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={className}>
          <Plus />
          {label}
          <ChevronDown className="size-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Choose how to create your case</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => openCase()}>
          <PanelsTopLeft />
          Create in modal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/cases/new" })}>
          <Maximize2 />
          Create on full page
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
