import { VisualCollectionLink } from "./visual-collection-link";
import { SingleCaseReport } from "./single-case-report";
import { CaseTeam } from "./case-team";
import { ModernSelect } from "@/components/ui/modern-select";
import { caseAmounts } from "@/lib/case-portfolio";
import { api } from "@/lib/api";
import { CaseImportDialog } from "./case-import-dialog";
import { CaseMoney, CaseStatusTiles, PortfolioFilters, CaseReportActions } from "./case-portfolio";
import { can, canViewInvoices } from "@/lib/access";
import { CreateCaseButton } from "./create-case-button";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { caseBilling } from "@/lib/billing";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  FolderOpen,
  Pencil,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, PageHeader, StatusBadge } from "./ui-bits";
import {
  useMe,
  useStore,
  useVisibleCases,
  defaultViews,
  uid,
  fmtDate,
  money,
  type SavedView,
} from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { CASE_TYPES, STATUSES, type CaseStatus } from "@/lib/domain";
import { caseCsv, filterCases, sortCases, type SortKey } from "@/lib/case-management";

const extraColumns = [
  { id: "ref", label: "REF CL#" },
  { id: "refId", label: "REF ID#" },
  { id: "attorney", label: "Attorney" },
  { id: "propertyType", label: "Property type" },
  { id: "unit", label: "Suite / Unit #" },
  { id: "squareFeet", label: "SF" },
  { id: "monthlyRent", label: "Monthly rent" },
  { id: "lastPaymentDate", label: "Last rental payment date" },
  { id: "visRI", label: "VIS - RI" },
  { id: "moneyOwed", label: "Balance owed" },
  { id: "community", label: "Apartment community" },
  { id: "neighborhood", label: "Neighborhood" },
  { id: "plaintiff", label: "Plaintiff" },
  { id: "tenant", label: "Tenant" },
  { id: "address", label: "Address" },
  { id: "county", label: "County" },
  { id: "city", label: "City" },
  { id: "state", label: "State" },
  { id: "zip", label: "Zip" },
  { id: "lastPayment", label: "Last payment" },
  { id: "balance", label: "Invoice balance" },
  { id: "setoutTime", label: "Setout Time" },
  { id: "visLO", label: "VIS - LO" },
  { id: "visTO", label: "VIS - TO" },
  { id: "locs", label: "LOCS" },
  { id: "lbx", label: "LBX" },
  { id: "manager", label: "Assigned manager" },
];
const columns: { id: string; label: string }[] = [
  { id: "number", label: "Case file" },
  { id: "client", label: "Customer / Tenant" },
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "serviceDate", label: "Setout Date" },
  { id: "staff", label: "Assigned staff" },
  { id: "invoice", label: "Invoices" },
  ...extraColumns,
];
function Choice({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  items: { id: string; name: string }[];
}) {
  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
      <SelectTrigger aria-label={label} className="w-full sm:w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
        {items.map((x) => (
          <SelectItem key={x.id} value={x.id}>
            {x.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function CasesTable() {
  const s = useStore();
  const me = useMe();
  const customer = me?.role === "customer";
  const nav = useNavigate();
  const cases = useVisibleCases();
  const openCase = useUI((u) => u.openCase);
  const [viewId, setViewId] = useState("all");
  const [filters, setFilters] = useState<SavedView["filters"]>(() => defaultViews()[0].filters);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "number", desc: true });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const availableColumns = columns.filter(
    (c) => canViewInvoices(me) || !["invoice", "balance", "lastPayment", "fee"].includes(c.id),
  );
  const visible = (
    s.tablePrefs?.visible?.length ? s.tablePrefs.visible : availableColumns.map((c) => c.id)
  ).filter((id) => availableColumns.some((c) => c.id === id));
  const pageSize = s.tablePrefs?.pageSize ?? 10;
  const rows = sortCases(
    filterCases(cases, filters, s.clients, s.users, me?.id),
    sort.key,
    sort.desc,
    s.clients,
    s.users,
  );
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const shown = rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const selection = selected.filter((id) => rows.some((c) => c.id === id));
  const updateFilters = (patch: Partial<SavedView["filters"]>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
    setSelected([]);
  };
  const changeView = (id: string) => {
    const view = s.savedViews.find((v) => v.id === id);
    if (view) {
      setViewId(id);
      setFilters({ ...view.filters });
      setPage(0);
      setSelected([]);
    }
  };
  const prefs = (patch: Partial<NonNullable<typeof s.tablePrefs>>) =>
    s.setTablePrefs({
      visible,
      order: columns.map((c) => c.id),
      widths: {},
      pageSize,
      ...s.tablePrefs,
      ...patch,
    });
  const exportRows = () => {
    const blob = new Blob(
      [
        "\uFEFF" +
          caseCsv(
            selection.length ? rows.filter((c) => selection.includes(c.id)) : rows,
            s.clients,
            s.users,
            s.invoices,
            canViewInvoices(me),
          ),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "legalflow-cases.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const bulkUpdate = async (patch: { status?: string; staffId?: string }) => {
    setBulkBusy(true);
    try {
      await api("/cases/bulk", {
        method: "PATCH",
        body: {
          cases: selection.map((id) => ({
            id,
            updatedAt: cases.find((c) => c.id === id)!.updatedAt,
          })),
          patch,
        },
      });
      await s.refresh();
      toast.success("Selected cases updated");
      setSelected([]);
    } catch (e) {
      toast.error((e as Error).message);
      await s.refresh();
    } finally {
      setBulkBusy(false);
    }
  };
  const toggle = (id: string) =>
    setSelected((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  return (
    <>
      <PageHeader
        title="Case Files"
        subtitle={`${cases.length} case files in your workspace`}
        actions={
          <>
            <Button variant="outline" onClick={exportRows}>
              <Download />
              Export CSV
            </Button>
            <CaseImportDialog />
            <CreateCaseButton />
          </>
        }
      />
      <CaseStatusTiles
        cases={rows}
        onSelect={(status) => updateFilters({ status: status === "All cases" ? [] : [status] })}
      />
      <CaseMoney cases={rows} />
      <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="Case views">
        <label className="flex items-center gap-2 text-sm">
          Saved view
          <ModernSelect
            className="h-9 rounded-lg border bg-background px-3"
            value={viewId}
            onChange={(e) => changeView(e.target.value)}
          >
            {s.savedViews.map((view) => (
              <option key={view.id} value={view.id}>
                {view.name}
              </option>
            ))}
          </ModernSelect>
        </label>
        {JSON.stringify(filters) !==
          JSON.stringify(s.savedViews.find((v) => v.id === viewId)?.filters) && (
          <span className="self-center px-2 text-xs text-muted-foreground">
            Unsaved filter changes
          </span>
        )}
        <CaseReportActions
          cases={rows}
          filters={filters}
          title={
            Object.entries(filters)
              .filter(([, v]) => (Array.isArray(v) ? v.length : !!v))
              .map(([k, v]) => k + " = " + String(v))
              .join(" · ") || "All accessible cases"
          }
        />
      </div>
      <div className="records-toolbar mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            aria-label="Search cases"
            placeholder="Search case files, customers or tenants…"
            className="pl-9"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
          />
        </div>
        <Button
          variant={showFilters ? "secondary" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter />
          Filters
        </Button>
        <Button
          variant="outline"
          title="Save current view"
          aria-label="Save current view"
          onClick={() => setSaveOpen(true)}
        >
          <Save />
          Save filters
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              title="Visible columns"
              aria-label="Visible columns"
            >
              <Settings2 />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableColumns.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.id}
                checked={visible.includes(c.id)}
                disabled={c.id === "number"}
                onCheckedChange={(checked) =>
                  prefs({
                    visible: checked ? [...visible, c.id] : visible.filter((x) => x !== c.id),
                  })
                }
              >
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {!s.savedViews.find((v) => v.id === viewId)?.builtIn && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete saved view"
            onClick={async () => {
              if (!(await s.deleteView(viewId))) return;
              changeView("all");
            }}
          >
            <Trash2 />
          </Button>
        )}
      </div>
      {showFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4">
          <PortfolioFilters cases={cases} filters={filters} onChange={updateFilters} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Status · {filters.status.length ? filters.status.join(", ") : "All"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {STATUSES.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={filters.status.includes(status)}
                  onCheckedChange={(checked) =>
                    updateFilters({
                      status: checked
                        ? [...filters.status, status]
                        : filters.status.filter((x) => x !== status),
                    })
                  }
                >
                  {status}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Choice
            label="Clients"
            value={filters.clientId}
            onChange={(v) => updateFilters({ clientId: v })}
            items={s.clients
              .filter((c) => cases.some((x) => x.clientId === c.id))
              .map((c) => ({ id: c.id, name: c.company }))}
          />
          <Choice
            label="Staff"
            value={filters.staffId}
            onChange={(v) => updateFilters({ staffId: v })}
            items={s.users.filter((u) => u.role === "staff")}
          />
          <Choice
            label="Types"
            value={filters.type}
            onChange={(v) => updateFilters({ type: v })}
            items={CASE_TYPES.map((v) => ({ id: v, name: v }))}
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            From
            <Input
              className="w-36"
              type="date"
              aria-label="Service date from"
              value={filters.dateFrom}
              onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            To
            <Input
              className="w-36"
              type="date"
              aria-label="Service date to"
              value={filters.dateTo}
              onChange={(e) => updateFilters({ dateTo: e.target.value })}
            />
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              changeView("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
      {!customer && selection.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 bg-accent px-3 py-2 text-sm">
          <span className="font-medium">{selection.length} selected</span>
          <CaseTeam rows={cases.filter((c) => selection.includes(c.id))} />
          <SingleCaseReport rows={cases.filter((c) => selection.includes(c.id))} />
          <Button variant="outline" size="sm" onClick={() => setSelected(rows.map((c) => c.id))}>
            Select all {rows.length} matching cases
          </Button>
          {can(me, "cases.edit") && me?.role === "owner" && (
            <ModernSelect
              aria-label="Assign selected cases to staff"
              className="h-9 rounded-lg border bg-card px-3"
              value=""
              disabled={bulkBusy}
              onChange={(e) => void bulkUpdate({ staffId: e.target.value })}
            >
              <option value="">Change primary staff + manager</option>
              {s.users
                .filter(
                  (u) =>
                    u.role === "staff" &&
                    u.status === "Active" &&
                    (me?.role === "owner" || u.managerId === me?.id),
                )
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </ModernSelect>
          )}
          <Select
            disabled={bulkBusy || !can(me, "cases.edit")}
            onValueChange={(v) => void bulkUpdate({ status: v })}
          >
            <SelectTrigger aria-label="Update selected status" className="w-44 bg-card">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!can(me, "cases.delete")}
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(selection)}
          >
            <Trash2 />
            Delete
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Clear selection"
            onClick={() => setSelected([])}
          >
            <X />
          </Button>
        </div>
      )}
      <div className="case-table overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead className="w-10">
                <Checkbox
                  disabled={customer}
                  aria-label="Select page"
                  checked={shown.length > 0 && shown.every((c) => selection.includes(c.id))}
                  onCheckedChange={(v) =>
                    setSelected(
                      v
                        ? [...new Set([...selected, ...shown.map((c) => c.id)])]
                        : selected.filter((id) => !shown.some((c) => c.id === id)),
                    )
                  }
                />
              </TableHead>
              {columns
                .filter((c) => visible.includes(c.id))
                .map((col) => (
                  <TableHead key={col.id} className="whitespace-nowrap">
                    {col.id === "invoice" || extraColumns.some((x) => x.id === col.id) ? (
                      col.label
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3"
                        onClick={() =>
                          setSort({
                            key: col.id as SortKey,
                            desc: sort.key === col.id ? !sort.desc : false,
                          })
                        }
                      >
                        {col.label}
                        {sort.key === col.id &&
                          (sort.desc ? (
                            <ArrowDown className="size-3" />
                          ) : (
                            <ArrowUp className="size-3" />
                          ))}
                      </Button>
                    )}
                  </TableHead>
                ))}
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((c) => {
              const client = s.clients.find((x) => x.id === c.clientId);
              const staff = s.users.find((x) => x.id === c.staffId);
              return (
                <TableRow key={c.id} data-state={selection.includes(c.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      disabled={customer}
                      aria-label={`Select ${c.number}`}
                      checked={selection.includes(c.id)}
                      onCheckedChange={() => toggle(c.id)}
                    />
                  </TableCell>
                  {visible.includes("number") && (
                    <TableCell className="min-w-56 max-w-72">
                      <Button
                        variant="link"
                        className="h-auto p-0 text-info"
                        onClick={() => nav({ to: "/cases/$id", params: { id: c.id } })}
                      >
                        {c.number}
                      </Button>
                      <div className="truncate text-xs text-muted-foreground" title={c.title}>
                        {c.title}
                      </div>
                      <div className="mt-1 text-xs">{c.type}</div>
                    </TableCell>
                  )}
                  {visible.includes("client") && (
                    <TableCell className="min-w-48">
                      <div className="text-sm font-medium">
                        {client?.company ?? "Unknown client"}
                      </div>
                      <div className="text-xs text-muted-foreground">{c.residentName}</div>
                    </TableCell>
                  )}
                  {visible.includes("status") && (
                    <TableCell>
                      <StatusBadge value={c.status} />
                    </TableCell>
                  )}
                  {visible.includes("priority") && (
                    <TableCell>
                      <StatusBadge value={c.priority} />
                    </TableCell>
                  )}
                  {visible.includes("serviceDate") && (
                    <TableCell className="whitespace-nowrap">
                      <div>{fmtDate(c.serviceDate)}</div>
                      <div className="text-xs text-muted-foreground">{c.serviceTime}</div>
                    </TableCell>
                  )}
                  {visible.includes("staff") && (
                    <TableCell>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <Avatar name={staff?.name ?? "Unassigned"} />
                        <span className="text-xs">{staff?.name ?? "Unassigned"}</span>
                      </div>
                    </TableCell>
                  )}
                  {visible.includes("fee") && (
                    <TableCell className="font-medium tabular-nums">{money(c.fee)}</TableCell>
                  )}
                  {visible.includes("invoice") && (
                    <TableCell>
                      <span className="whitespace-nowrap">
                        {
                          s.invoices.filter(
                            (i) => i.caseId === c.id && (!customer || i.status !== "Draft"),
                          ).length
                        }{" "}
                        invoices
                      </span>
                    </TableCell>
                  )}
                  {extraColumns
                    .filter((col) => visible.includes(col.id))
                    .map((col) => {
                      const b = caseBilling(s.invoices, c.id);
                      const value =
                        col.id === "manager"
                          ? s.users.find((u) => u.id === c.managerId)?.name
                          : col.id === "tenant"
                            ? c.residentName
                            : col.id === "address"
                              ? c.residentAddress
                              : col.id === "lastPayment"
                                ? b.lastPaymentDate
                                  ? `${money(b.lastPayment)} · ${fmtDate(b.lastPaymentDate)}`
                                  : "—"
                                : col.id === "moneyOwed"
                                  ? money(caseAmounts(c).due)
                                  : col.id === "balance"
                                    ? money(b.balance)
                                    : col.id === "setoutTime"
                                      ? c.serviceTime
                                      : c[col.id as keyof typeof c];
                      return (
                        <TableCell key={col.id} className="min-w-28 whitespace-nowrap">
                          {["visLO", "visTO", "visRI"].includes(col.id) ? <span className="inline-flex items-center gap-2"><span>{typeof value === "string" || typeof value === "number" ? value || "—" : "—"}</span><VisualCollectionLink caseId={c.id} caseNumber={c.number} field={col.id}/></span> : typeof value === "string" || typeof value === "number" ? value || "—" : "—"}
                        </TableCell>
                      );
                    })}
                  <TableCell>
                    <div className="flex">
                      {!customer && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!can(me, "cases.edit")}
                            title="Edit case"
                            aria-label={`Edit ${c.number}`}
                            onClick={() => openCase(c.id)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!can(me, "cases.delete")}
                            title="Delete case"
                            aria-label={`Delete ${c.number}`}
                            onClick={() => setConfirmDelete([c.id])}
                          >
                            <Trash2 className="size-3.5 text-muted-foreground" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => nav({ to: "/cases/$id", params: { id: c.id } })}
                      >
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {shown.length === 0 && (
              <TableRow>
                <TableCell colSpan={visible.length + 2} className="h-60 text-center">
                  <FolderOpen className="mx-auto mb-3 size-8 text-muted-foreground" />
                  <div className="font-medium">No matching case files</div>
                  <Button variant="link" onClick={() => changeView("all")}>
                    Clear filters
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
          <span>
            {rows.length ? currentPage * pageSize + 1 : 0}–
            {Math.min((currentPage + 1) * pageSize, rows.length)} of {rows.length} cases
          </span>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                prefs({ pageSize: Number(v) });
                setPage(0);
              }}
            >
              <SelectTrigger aria-label="Rows per page" className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} per page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft />
            </Button>
            <span>
              {currentPage + 1} / {pages}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={currentPage + 1 >= pages}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && !deleteBusy && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {confirmDelete?.length} case file{confirmDelete?.length === 1 ? "" : "s"}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The selected cases and all linked email conversations, messages and email attachments
            will be permanently deleted from LegalFlow. Queued emails will be removed. Emails
            already delivered to external mailboxes cannot be recalled. Cases with invoices or case
            documents cannot be deleted. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" disabled={deleteBusy} onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteBusy}
              onClick={async () => {
                if (deleteBusy) return;
                setDeleteBusy(true);
                const failed: string[] = [];
                try {
                  for (const id of confirmDelete ?? [])
                    if (!(await s.deleteCase(id, true))) failed.push(id);
                  setConfirmDelete(failed.length ? failed : null);
                  setSelected(failed);
                  if (!failed.length) toast.success("Cases and linked email conversations deleted");
                } finally {
                  setDeleteBusy(false);
                }
              }}
            >
              {deleteBusy ? "Deleting…" : "Delete cases & emails"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save case view</DialogTitle>
          </DialogHeader>
          <Input
            aria-label="View name"
            placeholder="View name"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            {!s.savedViews.find((v) => v.id === viewId)?.builtIn && (
              <Button
                variant="outline"
                onClick={async () => {
                  const view = s.savedViews.find((v) => v.id === viewId);
                  if (view && (await s.saveView({ ...view, filters: { ...filters } })))
                    setSaveOpen(false);
                }}
              >
                Update saved view
              </Button>
            )}
            <Button
              disabled={!viewName.trim()}
              onClick={async () => {
                const id = uid("view");
                if (!(await s.saveView({ id, name: viewName.trim(), filters: { ...filters } })))
                  return;
                setViewId(id);
                setSaveOpen(false);
                setViewName("");
              }}
            >
              Save view
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
