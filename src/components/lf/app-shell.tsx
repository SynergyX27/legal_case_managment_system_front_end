import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, FolderOpen, Users, CalendarDays, FileText, Receipt, MessagesSquare, Workflow,
  BarChart3, UserCog, Settings, Bell, Plus, Search, LogOut, PanelLeftClose, PanelLeft, Sparkles, Menu, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, Logo } from "./ui-bits";
import { canAccess, useMe, useStore, useVisibleCases } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { CaseFormDialog } from "./case-form-dialog";
import { InvoiceDialog } from "./invoice-dialog";
import { ClientDialog } from "./client-dialog";
import { AiAssistant } from "./ai-assistant";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { to: "/cases", label: "Case Files", icon: FolderOpen, key: "cases" },
  { to: "/clients", label: "Clients", icon: Users, key: "clients" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, key: "calendar" },
  { to: "/documents", label: "Documents", icon: FileText, key: "documents" },
  { to: "/invoices", label: "Invoices", icon: Receipt, key: "invoices" },
  { to: "/communications", label: "Communications", icon: MessagesSquare, key: "communications" },
  { to: "/automations", label: "Automations", icon: Workflow, key: "automations" },
  { to: "/ai-insights", label: "AI Insights", icon: Sparkles, key: "ai" },
  { to: "/reports", label: "Reports & Analytics", icon: BarChart3, key: "reports" },
  { to: "/users", label: "User Management", icon: UserCog, key: "users" },
  { to: "/settings", label: "Settings", icon: Settings, key: "settings" },
] as const;

const roleLabel = { owner: "Owner / Super Admin", manager: "Account Manager", staff: "Staff Member" };

function SidebarBody({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const me = useMe();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  if (!me) return null;
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex h-14 items-center border-b border-sidebar-border px-4", collapsed && "justify-center px-0")}>
        {collapsed ? <span className="font-display text-lg font-semibold text-sidebar-primary">LF</span> : <Logo light />}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {nav.filter((n) => canAccess(me.role, n.key)).map((n) => {
          const active = path === n.to || path.startsWith(n.to + "/");
          return (
            <Link key={n.to} to={n.to} onClick={onNavigate} title={n.label}
              className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground", collapsed && "justify-center px-0")}>
              <n.icon className={cn("size-4 shrink-0", active && "text-sidebar-primary")} />
              {!collapsed && <span className="truncate">{n.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger className={cn("flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-sidebar-accent", collapsed && "justify-center")}>
            <Avatar name={me.name} className="bg-sidebar-primary text-sidebar-primary-foreground" />
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-sidebar-accent-foreground">{me.name}</div>
                <div className="truncate text-xs text-sidebar-foreground/70">{roleLabel[me.role]}</div>
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}><Settings className="size-4" /> Profile settings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { logout(); navigate({ to: "/" }); }}><LogOut className="size-4" /> Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const me = useMe();
  const navigate = useNavigate();
  const { openCase, openInvoice, openClient, setAi } = useUI();
  const notifications = useStore((s) => s.notifications);
  const markRead = useStore((s) => s.markRead);
  const markAllRead = useStore((s) => s.markAllRead);
  const logout = useStore((s) => s.logout);
  const accounts = useStore((s) => s.accounts);
  const acct = useStore((s) => s.activeAccountId);
  const setAccount = useStore((s) => s.setAccount);
  const clients = useStore((s) => s.clients);
  const cases = useVisibleCases();
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  if (!me) return null;

  return (
    <div className="flex min-h-screen w-full">
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 transition-[width] md:block", collapsed ? "w-16" : "w-60")}>
        <SidebarBody collapsed={collapsed} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-0 p-0"><SidebarBody collapsed={false} onNavigate={() => setMobileOpen(false)} /></SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur md:px-5">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}><Menu className="size-4" /></Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">
            {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
          <Button variant="outline" onClick={() => setSearchOpen(true)} aria-label="Search workspace" className="h-9 min-w-0 flex-1 justify-start gap-2 bg-background px-3 text-sm text-muted-foreground md:max-w-md">
            <Search className="size-4 shrink-0" /> <span className="truncate">Search cases, clients, residents…</span>
            <kbd className="ml-auto hidden rounded border bg-muted px-1.5 text-[10px] sm:inline">⌘K</kbd>
          </Button>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {me.role === "owner" && (
              <Select value={acct} onValueChange={setAccount}>
                <SelectTrigger className="hidden h-9 w-48 lg:flex"><Building2 className="size-4" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => setAi(true)}><Sparkles className="size-4 text-info" /> Assistant</Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="size-4" />
                  {unread > 0 && <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">{unread}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-4 py-2.5">
                  <span className="text-sm font-semibold">Notifications</span>
                  <button className="text-xs text-info hover:underline" onClick={markAllRead}>Mark all as read</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.slice(0, 8).map((n) => (
                    <button key={n.id} onClick={() => { markRead(n.id); if (n.link) navigate({ to: n.link }); }} className="flex w-full gap-3 border-b px-4 py-2.5 text-left text-sm last:border-0 hover:bg-muted">
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-info")} />
                      <span><span className={cn(!n.read && "font-medium")}>{n.text}</span><span className="block text-xs text-muted-foreground">{new Date(n.at).toLocaleString()}</span></span>
                    </button>
                  ))}
                </div>
                <Link to="/notifications" className="block border-t px-4 py-2 text-center text-xs font-medium text-info hover:bg-muted">View all notifications</Link>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="sm"><Plus className="size-4" /><span className="hidden sm:inline">Quick Add</span></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => openCase()}>New case</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openClient()}>New client</DropdownMenuItem>
                {canAccess(me.role, "invoices") && <DropdownMenuItem onClick={() => openInvoice()}>New invoice</DropdownMenuItem>}
                <DropdownMenuItem onClick={() => navigate({ to: "/calendar" })}>Schedule service</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/documents" })}>Upload document</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full"><Avatar name={me.name} className="size-8" /></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel><div>{me.name}</div><div className="text-xs font-normal text-muted-foreground">{me.email}</div></DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>Profile settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/notifications" })}>Notifications</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { logout(); navigate({ to: "/" }); }}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search cases, clients, residents…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Cases">
            {cases.slice(0, 40).map((c) => (
              <CommandItem key={c.id} value={`${c.number} ${c.residentName} ${c.title}`} onSelect={() => { setSearchOpen(false); navigate({ to: "/cases/$id", params: { id: c.id } }); }}>
                <FolderOpen className="size-4" /> {c.number} · {c.residentName}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Clients">
            {clients.map((c) => (
              <CommandItem key={c.id} value={`${c.name} ${c.company}`} onSelect={() => { setSearchOpen(false); navigate({ to: "/clients/$id", params: { id: c.id } }); }}>
                <Users className="size-4" /> {c.name} · {c.company}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <CaseFormDialog />
      <InvoiceDialog />
      <ClientDialog />
      <AiAssistant />
    </div>
  );
}
