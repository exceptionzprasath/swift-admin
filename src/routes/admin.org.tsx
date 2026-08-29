import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  useStore,
  getEmployeeBranchIds,
  type Employee,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Network, Pencil, ArrowUp, ArrowDown, Mail, Phone, Building2, MapPin,
  Search, ChevronDown, ChevronRight, Users, LayoutGrid, GitBranch, Maximize2,
  Minimize2, Zap, Sliders, CalendarDays, MessageSquareHeart, FileText,
  CheckCircle2, AlertCircle, Plus, Edit2, ShieldCheck, MoreHorizontal,
  ExternalLink, ChevronUp, RefreshCw, SlidersHorizontal
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/org")({
  head: () => ({ meta: [{ title: "Organization Structure · SWIFT" }] }),
  component: OrgPage,
});

function initials(name: string) {
  return (name || "").split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}

type ViewMode = "tree" | "grid";

function OrgPage() {
  const { employees, updateEmployee, company } = useStore();
  const branches = company.branches ?? [];

  // Edit Employee Basic Info Modal
  const [editOpen, setEditOpen] = useState(false);
  const [target, setTarget] = useState<Employee | null>(null);
  const [about, setAbout] = useState("");
  const [managerId, setManagerId] = useState<string>("");
  const [branchId, setBranchId] = useState<string>("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");

  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("tree");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [branchFilter, setBranchFilter] = useState<string>("__all");

  const byId = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const q = query.trim().toLowerCase();
  const matchIds = useMemo(() => {
    if (!q) return null;
    const s = new Set<string>();
    employees.forEach((e) => {
      const hay = `${e.name} ${e.empCode} ${e.designation} ${e.department} ${e.email ?? ""}`.toLowerCase();
      if (hay.includes(q)) s.add(e.id);
    });
    return s;
  }, [q, employees]);

  const filteredEmployees = useMemo(
    () => employees.filter((e) => (branchFilter === "__all" ? true : (e.branchId || "__unassigned") === branchFilter)),
    [employees, branchFilter],
  );

  // Group by branch
  const byBranch = useMemo(() => {
    const g = new Map<string, Employee[]>();
    filteredEmployees.forEach((e) => {
      const key = e.branchId || "__unassigned";
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(e);
    });
    return g;
  }, [filteredEmployees]);

  function childrenMapFor(list: Employee[]) {
    const ids = new Set(list.map((e) => e.id));
    const map = new Map<string | undefined, Employee[]>();
    for (const e of list) {
      const key = e.managerId && ids.has(e.managerId) ? e.managerId : undefined;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => {
        const ac = (map.get(a.id)?.length ?? 0);
        const bc = (map.get(b.id)?.length ?? 0);
        if (ac !== bc) return bc - ac;
        return a.name.localeCompare(b.name);
      });
      map.set(k, arr);
    }
    return map;
  }

  function openEdit(e: Employee) {
    setTarget(e);
    setAbout(e.about ?? "");
    setManagerId(e.managerId ?? "__none");
    setBranchId(e.branchId ?? "__none");
    setDesignation(e.designation);
    setDepartment(e.department);
    setEditOpen(true);
  }

  function save() {
    if (!target) return;
    if (managerId && managerId !== "__none" && managerId === target.id) return toast.error("An employee cannot report to themselves");
    if (managerId && managerId !== "__none") {
      let cur: string | undefined = managerId;
      const seen = new Set<string>();
      while (cur) {
        if (cur === target.id) return toast.error("Cycle detected — pick a different manager");
        if (seen.has(cur)) break;
        seen.add(cur);
        cur = byId.get(cur)?.managerId;
      }
    }
    updateEmployee(target.id, {
      about, designation, department,
      managerId: managerId === "__none" ? undefined : managerId,
      branchId: branchId === "__none" ? undefined : branchId,
    });
    toast.success(`${target.name} updated`);
    setEditOpen(false);
  }

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function expandAll() { setCollapsed(new Set()); }
  function collapseAll() {
    const managers = new Set<string>();
    employees.forEach((e) => { if (e.managerId) managers.add(e.managerId); });
    setCollapsed(managers);
  }

  if (employees.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <Network className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <div className="text-sm text-muted-foreground">Add employees first to build your organization structure.</div>
      </div>
    );
  }

  const groupOrder = [
    ...branches.map((b) => b.id),
    "__unassigned",
  ].filter((k) => byBranch.has(k));

  const totalPeople = employees.length;
  const managerCount = new Set(employees.map((e) => e.managerId).filter(Boolean) as string[]).size;
  const topLevel = employees.filter((e) => !e.managerId || !byId.has(e.managerId)).length;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" /> Organization Structure
          </h1>
          <p className="text-sm text-muted-foreground">
            Visual reporting hierarchy and team structure. Approvals are automatically orchestrated via the centralized <Link to="/admin/approval-settings" className="font-semibold text-primary underline underline-offset-4">Approval Settings</Link> studio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/admin/approval-settings">
            <Button size="sm" variant="outline" className="h-9 gap-1.5 font-semibold text-xs border-primary/30 text-primary bg-primary/5 hover:bg-primary hover:text-white">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Centralized Approval Settings
            </Button>
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
            <Users className="h-3.5 w-3.5" /> {totalPeople} people · {managerCount} managers · {topLevel} at top
          </div>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, code, department..." className="h-9 pl-8 w-60" />
          </div>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All branches</SelectItem>
              {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              <SelectItem value="__unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
          <div className="inline-flex items-center rounded-lg border border-border overflow-hidden">
            <Button variant={view === "tree" ? "default" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => setView("tree")}>
              <GitBranch className="h-3.5 w-3.5 mr-1" /> Tree
            </Button>
            <Button variant={view === "grid" ? "default" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => setView("grid")}>
              <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Grid
            </Button>
          </div>
          {view === "tree" && (
            <div className="inline-flex items-center rounded-lg border border-border overflow-hidden">
              <Button variant="ghost" size="sm" className="rounded-none h-9" onClick={expandAll} title="Expand all">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="rounded-none h-9" onClick={collapseAll} title="Collapse all">
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {groupOrder.map((key) => {
          const list = byBranch.get(key)!;
          const branch = branches.find((b) => b.id === key);
          const cmap = childrenMapFor(list);
          const roots = cmap.get(undefined) ?? [];
          return (
            <section key={key} className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-soft">
              <header className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-border">
                <div className="h-10 w-10 rounded-xl bg-gradient-brand text-white grid place-items-center shadow-soft shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-semibold truncate">
                      {branch ? branch.name : "Unassigned Branch"}
                    </h2>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {list.length} {list.length === 1 ? "person" : "people"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    {branch?.city && <span><MapPin className="inline h-3 w-3 mr-0.5" /> {branch.city}</span>}
                    {branch?.state && <span>· {branch.state}</span>}
                    {branch?.isHead && <Badge variant="outline" className="text-[10px] py-0">HQ</Badge>}
                  </div>
                </div>
              </header>

              {view === "tree" ? (
                roots.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No roots found. Ensure at least one person has no manager within this branch.
                  </div>
                ) : (
                  <div className="overflow-x-auto py-4">
                    <div className="flex gap-8 justify-center min-w-max">
                      {roots.map((r) => (
                        <OrgNode
                          key={r.id}
                          emp={r}
                          childrenOf={cmap}
                          byId={byId}
                          onEdit={openEdit}
                          branchName={branch?.name}
                          collapsed={collapsed}
                          toggleCollapsed={toggleCollapsed}
                          matchIds={matchIds}
                        />
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <VirtualizedOrgGrid
                  list={list}
                  cmap={cmap}
                  byId={byId}
                  branchName={branch?.name}
                  onEdit={openEdit}
                />
              )}
            </section>
          );
        })}
      </div>

      {/* Edit Employee Basic Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile & Reporting</DialogTitle>
            <DialogDescription>
              Update employee role, department, branch, or manager.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Designation</Label>
              <Input value={designation} onChange={(e) => setDesignation(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Department</Label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reports To (Manager)</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No Manager (Top-level)</SelectItem>
                  {employees
                    .filter((e) => !target || e.id !== target.id)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.empCode} · {e.designation})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">About</Label>
              <Textarea rows={2} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Short bio..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrgNode({
  emp, childrenOf, byId, onEdit, branchName, collapsed, toggleCollapsed, matchIds,
}: {
  emp: Employee;
  childrenOf: Map<string | undefined, Employee[]>;
  byId: Map<string, Employee>;
  onEdit: (e: Employee) => void;
  branchName?: string;
  collapsed: Set<string>;
  toggleCollapsed: (id: string) => void;
  matchIds: Set<string> | null;
}) {
  const directs = childrenOf.get(emp.id) ?? [];
  const hasDirects = directs.length > 0;
  const isCollapsed = collapsed.has(emp.id);
  const manager = emp.managerId ? byId.get(emp.managerId) : undefined;
  const isMatch = matchIds ? matchIds.has(emp.id) : true;

  const rows = useMemo(() => {
    if (directs.length <= 4) return [directs];
    const mid = Math.ceil(directs.length / 2);
    return [directs.slice(0, mid), directs.slice(mid)];
  }, [directs]);

  return (
    <div className={`flex flex-col items-center transition-opacity ${matchIds && !isMatch ? "opacity-30" : "opacity-100"}`}>
      <div className="relative">
        <NameBadge
          emp={emp}
          manager={manager}
          directs={directs}
          onEdit={onEdit}
          branchName={branchName}
        />
        {hasDirects && (
          <button
            type="button"
            onClick={() => toggleCollapsed(emp.id)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 px-2 rounded-full bg-primary text-primary-foreground border border-background shadow-xs text-[10.5px] font-bold flex items-center gap-1 hover:scale-105 transition-transform z-10"
            title={isCollapsed ? "Expand team" : "Collapse team"}
          >
            <span>{directs.length}</span>
            {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
        )}
      </div>

      {!isCollapsed && rows.length > 0 && (
        <>
          <div className="w-px h-6 bg-border" />
          <div className="flex flex-col gap-3">
            {rows.map((row, ri) => (
              <div key={ri} className="flex gap-6 relative justify-center">
                {row.length > 1 && (
                  <div
                    className="absolute top-0 h-px bg-border"
                    style={{ left: `${14 * 8}px`, right: `${14 * 8}px` }}
                  />
                )}
                {row.map((k) => (
                  <div key={k.id} className="flex flex-col items-center">
                    <div className="w-px h-4 bg-border" />
                    <OrgNode
                      emp={k}
                      childrenOf={childrenOf}
                      byId={byId}
                      onEdit={onEdit}
                      branchName={branchName}
                      collapsed={collapsed}
                      toggleCollapsed={toggleCollapsed}
                      matchIds={matchIds}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NameBadge({
  emp, manager, directs, onEdit, branchName,
}: {
  emp: Employee;
  manager?: Employee;
  directs: Employee[];
  onEdit: (e: Employee) => void;
  branchName?: string;
}) {
  const teamSize = directs.length;
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <div className={`w-[15rem] rounded-2xl border bg-card p-3.5 shadow-soft hover:shadow-glow transition-all cursor-pointer group relative ${teamSize > 0 ? "border-primary/40" : "border-border"}`}>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full ring-2 ring-primary/30 bg-primary/10 text-primary grid place-items-center overflow-hidden shrink-0">
              {emp.photoDataUrl ? <img src={emp.photoDataUrl} className="h-full w-full object-cover" alt={emp.name} /> : <span className="font-semibold">{initials(emp.name)}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate text-foreground">{emp.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{emp.designation}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => { e.stopPropagation(); onEdit(emp); }}
              title="Edit Profile"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">{emp.department}</Badge>
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">{emp.empCode}</Badge>
            {teamSize > 0 && (
              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] py-0 px-1.5 flex items-center gap-0.5">
                <Users className="h-2.5 w-2.5" /> {teamSize}
              </Badge>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(emp);
              }}
            >
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
            <Link to="/admin/approval-settings" className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] w-full font-medium bg-primary/5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <SlidersHorizontal className="h-3 w-3" /> Approvals
              </Button>
            </Link>
          </div>
        </div>
      </HoverCardTrigger>

      <HoverCardContent className="w-80" side="right" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full ring-2 ring-primary/30 bg-primary/10 text-primary grid place-items-center overflow-hidden shrink-0">
              {emp.photoDataUrl ? <img src={emp.photoDataUrl} className="h-full w-full object-cover" alt={emp.name} /> : <span className="font-semibold text-lg">{initials(emp.name)}</span>}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate text-foreground">{emp.name}</div>
              <div className="text-xs text-muted-foreground truncate">{emp.designation} · {emp.department}</div>
              <div className="text-[11px] text-muted-foreground">Emp Code {emp.empCode} · Joined {emp.doj}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
            <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => onEdit(emp)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Link to="/admin/approval-settings" className="w-full">
              <Button
                size="sm"
                className="w-full text-xs bg-primary text-primary-foreground"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1" /> Approvals
              </Button>
            </Link>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function VirtualizedOrgGrid({
  list, cmap, byId, branchName, onEdit,
}: {
  list: Employee[];
  cmap: Map<string | undefined, Employee[]>;
  byId: Map<string, Employee>;
  branchName?: string;
  onEdit: (e: Employee) => void;
}) {
  const [columns, setColumns] = useState<number>(() => {
    if (typeof window === "undefined") return 3;
    const w = window.innerWidth;
    if (w < 640) return 1;
    if (w < 1024) return 2;
    if (w < 1440) return 3;
    return 4;
  });

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      if (w < 640) setColumns(1);
      else if (w < 1024) setColumns(2);
      else if (w < 1440) setColumns(3);
      else setColumns(4);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const rows = useMemo(() => {
    const out: Employee[][] = [];
    for (let i = 0; i < list.length; i += columns) {
      out.push(list.slice(i, i + columns));
    }
    return out;
  }, [list, columns]);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 140,
    overscan: 4,
  });

  return (
    <div ref={parentRef} className="relative w-full">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((vRow) => {
          const rowItems = rows[vRow.index] ?? [];
          return (
            <div
              key={vRow.key}
              data-index={vRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vRow.start}px)`,
              }}
              className="py-2"
            >
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
              >
                {rowItems.map((emp) => {
                  const manager = emp.managerId ? byId.get(emp.managerId) : undefined;
                  const directs = cmap.get(emp.id) ?? [];
                  return (
                    <div key={emp.id} className="w-full">
                      <NameBadge
                        emp={emp}
                        manager={manager}
                        directs={directs}
                        onEdit={onEdit}
                        branchName={branchName}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
