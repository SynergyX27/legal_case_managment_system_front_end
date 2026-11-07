import { ThemeToggle } from "./theme-provider";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  CalendarDays,
  FileText,
  Receipt,
  MessagesSquare,
  BarChart3,
  UserCog,
  Settings,
  Bell,
  Plus,
  Search,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Menu,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, Logo } from "./ui-bits";
import { canAccess, useMe, useStore, useVisibleCases } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { canReadConversation } from "@/lib/access";
import { conversationUnread } from "@/lib/messaging";
import { CaseFormDialog } from "./case-form-dialog";
import { InvoiceDialog } from "./invoice-dialog";
import { ClientDialog } from "./client-dialog";
import { FloatingMessenger } from "./messenger";
import { cn } from "@/lib/utils";
const navigation = [
  {
    to: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    key: "dashboard",
    group: "Workspace",
  },
  { to: "/cases", label: "Case files", icon: FolderOpen, key: "cases", group: "Workspace" },
  { to: "/clients", label: "Customers", icon: Users, key: "clients", group: "Workspace" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, key: "calendar", group: "Workspace" },
  { to: "/documents", label: "Documents", icon: FileText, key: "documents", group: "Workspace" },
  { to: "/invoices", label: "Invoices", icon: Receipt, key: "invoices", group: "Workspace" },
  {
    to: "/communications",
    label: "Messages",
    icon: MessagesSquare,
    key: "communications",
    group: "Workspace",
  },
  {
    to: "/reports",
    label: "Reports & insights",
    icon: BarChart3,
    key: "reports",
    group: "Management",
  },
  {
    to: "/company-documents",
    label: "Company documents",
    icon: FileText,
    key: "company-documents",
    group: "Management",
  },
  { to: "/users", label: "People & access", icon: UserCog, key: "users", group: "Management" },
  { to: "/settings", label: "Settings", icon: Settings, key: "settings", group: "Management" },
] as const;
const roles = {
  owner: "Workspace owner",
  manager: "Manager",
  staff: "Team member",
  customer: "Customer portal",
};
function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const s = useStore(),
    me = useMe(),
    path = useRouterState({ select: (s) => s.location.pathname }),
    navigate = useNavigate();
  if (!me) return null;
  const unread = s.conversations
    .filter((c) => canReadConversation(me, c, s.users, s.cases))
    .reduce((n, c) => n + conversationUnread(c, me.id, s.chatRead ?? {}), 0);
  return (
    <div className="workspace-sidebar">
      <div className={cn("sidebar-brand", collapsed && "is-collapsed")}>
        <Logo compact={collapsed} />
      </div>
      {!collapsed && (
        <div className="sidebar-workspace">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">
              {me.role === "customer" ? "My workspace" : "LegalFlow workspace"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{roles[me.role]}</p>
          </div>
        </div>
      )}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {["Workspace", "Management"].map((group) => {
          const items = navigation.filter((n) => n.group === group && canAccess(me.role, n.key));
          return (
            items.length > 0 && (
              <div key={group} className="mb-5">
                {!collapsed && <p className="sidebar-section-label">{group}</p>}
                {items.map((n) => {
                  const active = path === n.to || path.startsWith(n.to + "/");
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      search={
                        n.to === "/communications"
                          ? { person: undefined }
                          : n.to === "/invoices"
                            ? { caseId: undefined }
                            : undefined
                      }
                      onClick={onNavigate}
                      title={n.label}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "sidebar-link",
                        active && "is-active",
                        collapsed && "is-collapsed",
                      )}
                    >
                      <n.icon className="size-[18px] shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{n.label}</span>
                          {n.key === "communications" && unread > 0 && (
                            <span className="sidebar-count">{unread}</span>
                          )}
                          {active && n.key !== "communications" && (
                            <span className="size-1.5 rounded-full bg-primary" />
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            )
          );
        })}
      </nav>
      {!collapsed && (
        <div className="sidebar-note">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <MessagesSquare className="size-4" />
            <span className="text-xs font-semibold">A connected workspace</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Your case team is always within reach.
          </p>
          <button
            onClick={() => {
              useUI.getState().openChat();
              onNavigate?.();
            }}
            className="mt-3 flex items-center gap-2 text-xs font-semibold text-primary"
          >
            Open messages <ArrowUpRight className="size-3.5" />
          </button>
        </div>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn("sidebar-profile", collapsed && "justify-center")}
          aria-label="Account menu"
        >
          <Avatar name={me.name} className="size-9 rounded-xl" />
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-xs font-semibold">{me.name}</p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{me.email}</p>
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-64">
          <DropdownMenuLabel>{roles[me.role]}</DropdownMenuLabel>
          {canAccess(me.role, "settings") && (
            <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
              <Settings />
              Settings
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await s.logout();
              navigate({ to: "/" });
            }}
          >
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false),
    [mobileOpen, setMobileOpen] = useState(false),
    [searchOpen, setSearchOpen] = useState(false);
  const s = useStore(),
    me = useMe(),
    navigate = useNavigate(),
    ui = useUI(),
    cases = useVisibleCases();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const section = navigation.find((n) => path === n.to || path.startsWith(n.to + "/"));
  const notifications = s.notifications;
  const clients = s.clients.filter((c) =>
    me?.role === "owner"
      ? true
      : me?.role === "customer"
        ? c.id === me.clientId
        : cases.some((x) => x.clientId === c.id),
  );
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  useEffect(() => {
    ui.setChatOpen(false);
    ui.selectChat("");
  }, [me?.id]);
  if (!me) return null;
  return (
    <div className="workspace-app">
      <aside className={cn("desktop-sidebar", collapsed && "is-collapsed")}>
        <Sidebar collapsed={collapsed} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] border-0 p-0">
          <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="min-w-0 flex-1">
        <header className="workspace-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              className="md:hidden"
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </Button>
            <Button
              className="hidden md:inline-flex"
              variant="ghost"
              size="icon"
              aria-label="Toggle sidebar"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <PanelLeft /> : <PanelLeftClose />}
            </Button>
            <div className="hidden items-center gap-2 text-xs sm:flex">
              <span className="text-muted-foreground">Workspace</span>
              <ChevronRight className="size-3 text-muted-foreground/60" />
              <span className="font-semibold">{section?.label ?? "Overview"}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button
              className="topbar-search"
              onClick={() => setSearchOpen(true)}
              aria-label="Search workspace"
            >
              <Search className="size-4" />
              <span className="hidden lg:inline">Search anything…</span>
              <kbd className="hidden rounded border bg-card px-1.5 py-0.5 text-[9px] lg:inline">
                Ctrl K
              </kbd>
            </button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                  <Bell className="size-[18px]" />
                  {notifications.some((n) => !n.read) && (
                    <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary ring-2 ring-white" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b p-4">
                  <h2 className="text-sm font-semibold">Notifications</h2>
                  <button className="text-xs text-primary" onClick={s.markAllRead}>
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.slice(0, 8).map((n) => (
                    <button
                      key={n.id}
                      className="flex w-full gap-3 border-b p-4 text-left text-xs leading-relaxed hover:bg-muted"
                      onClick={() => {
                        s.markRead(n.id);
                        if (n.link) navigate({ to: n.link });
                      }}
                    >
                      <span
                        className={cn(
                          "mt-1 size-1.5 shrink-0 rounded-full",
                          n.read ? "bg-border" : "bg-primary",
                        )}
                      />
                      <span>
                        {n.text}
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {new Date(n.at).toLocaleString()}
                        </span>
                      </span>
                    </button>
                  ))}
                  {!notifications.length && (
                    <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                      You're all caught up.
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <div className="hidden h-6 border-l sm:block" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full p-1"
                  aria-label="Profile menu"
                >
                  <Avatar name={me.name} className="size-8" />
                  <ChevronDown className="hidden size-3 text-muted-foreground sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  {me.name}
                  <p className="mt-1 text-xs font-normal text-muted-foreground">{me.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => ui.openChat()}>
                  <MessagesSquare />
                  Messages
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await s.logout();
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {me.role !== "customer" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="ml-1">
                    <Plus />
                    <span className="hidden sm:inline">Create new</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled={me.role === "staff"} onClick={() => ui.openCase()}>
                    <FolderOpen />
                    Case file
                  </DropdownMenuItem>
                  {me.role === "owner" && (
                    <DropdownMenuItem onClick={() => ui.openClient()}>
                      <Users />
                      Customer
                    </DropdownMenuItem>
                  )}
                  {["owner", "manager"].includes(me.role) && (
                    <DropdownMenuItem onClick={() => ui.openInvoice()}>
                      <Receipt />
                      Invoice
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate({ to: "/calendar" })}>
                    <CalendarDays />
                    Calendar event
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        {s.connectionError && (
          <div
            role="alert"
            className="border-b border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive"
          >
            {s.connectionError}{" "}
            <button className="underline" onClick={() => s.refresh()}>
              Retry
            </button>
          </div>
        )}
        <main className="app-main">
          <div className="workspace-content">{children}</div>
          <footer className="workspace-footer">
            <span>
              LegalFlow <span className="mx-2 text-border">/</span> Built around your cases.
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary/60" />
              Your workspace
            </span>
          </footer>
        </main>
      </div>
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search cases, customers or tenants…" />
        <CommandList>
          <CommandEmpty>No matching records.</CommandEmpty>
          <CommandGroup heading="Case files">
            {cases.slice(0, 40).map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.number} ${c.ref} ${c.residentName} ${c.title}`}
                onSelect={() => {
                  setSearchOpen(false);
                  navigate({ to: "/cases/$id", params: { id: c.id } });
                }}
              >
                <FolderOpen />
                {c.number} · {c.residentName}
              </CommandItem>
            ))}
          </CommandGroup>
          {me.role !== "customer" && (
            <CommandGroup heading="Customers">
              {clients.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.company}`}
                  onSelect={() => {
                    setSearchOpen(false);
                    navigate({ to: "/clients/$id", params: { id: c.id } });
                  }}
                >
                  <Users />
                  {c.name} · {c.company}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
      <CaseFormDialog />
      <InvoiceDialog />
      <ClientDialog />
      <FloatingMessenger key={me.id} />
    </div>
  );
}
