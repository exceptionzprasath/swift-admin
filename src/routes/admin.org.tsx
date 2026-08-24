import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useStore, getEmployeeBranchIds, type Employee } from "@/lib/store";
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
  Search, ChevronDown, ChevronRight, Users, LayoutGrid, GitBranch, Maximize2, Minimize2, Zap,
} from "lucide-react";
import { toast } from "sonner";

const VIRTUALIZE_THRESHOLD = 80; // cards per branch before we virtualize the grid
const AUTO_GRID_THRESHOLD = 400; // employees total before defaulting to grid
const AUTO_COLLAPSE_ROOTS = 25;  // if a branch has this many top-level people, collapse by default

export const Route = createFileRoute("/admin/org")({
  head: () => ({ meta: [{ title: "Organization · SWIFT" }] }),
  component: OrgPage,
});

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}

type ViewMode = "tree" | "grid";

function OrgPage() {
  const { employees, updateEmployee, company } = useStore();
  const branches = company.branches ?? [];

  const [editOpen, setEditOpen] = useState(false);
  const [target, setTarget] = useState<Employee | null>(null);
  const [about, setAbout] = useState("");
  const [managerId, setManagerId] = useState<string>("");
  const [branchId, setBranchId] = useState<string>("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");

  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>(employees.length > AUTO_GRID_THRESHOLD ? "grid" : "tree");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [branchFilter, setBranchFilter] = useState<string>("__all");
  const autoCollapsedRef = useRef(false);

  const byId = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  // For very large orgs, collapse dense subtrees on first render so the DOM stays lean.
  useEffect(() => {
    if (autoCollapsedRef.current) return;
    if (employees.length < AUTO_GRID_THRESHOLD) return;
    const managers = new Set<string>();
    employees.forEach((e) => { if (e.managerId) managers.add(e.managerId); });
    setCollapsed(managers);
    autoCollapsedRef.current = true;
  }, [employees]);

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
    // sort: managers-first, then alpha — keeps big teams tidy
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
    // collapse every manager (anyone with reports)
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
    ...(byBranch.has("__unassigned") ? ["__unassigned"] : []),
  ].filter((k) => byBranch.has(k));

  // Stats
  const totalPeople = employees.length;
  const managerCount = new Set(employees.map((e) => e.managerId).filter(Boolean) as string[]).size;
  const topLevel = employees.filter((e) => !e.managerId || !byId.has(e.managerId)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" /> Organization Structure
          </h1>
          <p className="text-sm text-muted-foreground">
            One manager can have any number of direct reports. Click a card to expand or collapse the team below it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
            <Users className="h-3.5 w-3.5" /> {totalPeople} people · {managerCount} managers · {topLevel} at top
          </div>
          {totalPeople > VIRTUALIZE_THRESHOLD && view === "grid" && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-primary bg-primary/10 border border-primary/30 rounded-lg px-2 py-1.5" title="Only rows near the viewport are rendered for performance">
              <Zap className="h-3 w-3" /> Virtualized
            </div>
          )}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find person, code, dept…" className="h-9 pl-8 w-52" />
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
            <section key={key} className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              <header className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-border">
                <div className="h-10 w-10 rounded-xl bg-gradient-brand text-white grid place-items-center shadow-soft shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold flex items-center gap-2 flex-wrap">
                    {branch ? branch.name : "Unassigned"}
                    {branch?.isHead && <Badge className="bg-primary text-primary-foreground text-[10px]">HQ</Badge>}
                    <Badge variant="outline" className="text-[10px]">{list.length} people</Badge>
                    <Badge variant="outline" className="text-[10px]">{roots.length} top-level</Badge>
                  </div>
                  {branch && (
                    <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{branch.address}, {branch.city}</span>
                      {branch.lat != null && <span>Geo-fence {branch.radiusMeters ?? 150}m</span>}
                      {branch.shiftStart && branch.shiftEnd && <span>Shift {branch.shiftStart}–{branch.shiftEnd}</span>}
                    </div>
                  )}
                </div>
              </header>

              {view === "grid" ? (
                list.length > VIRTUALIZE_THRESHOLD ? (
                  <VirtualGrid
                    list={list}
                    byId={byId}
                    cmap={cmap}
                    onEdit={openEdit}
                    branchName={branch?.name}
                    matchIds={matchIds}
                  />
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
                    {list.map((e) => (
                      <div key={e.id} className={matchIds && !matchIds.has(e.id) ? "opacity-40" : ""}>
                        <NameBadge
                          emp={e}
                          manager={e.managerId ? byId.get(e.managerId) : undefined}
                          directs={cmap.get(e.id) ?? []}
                          onEdit={openEdit}
                          branchName={branch?.name}
                        />
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-max py-2">
                    {roots.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-4">All employees here report to someone in another branch — showing flat:</div>
                    ) : null}
                    <div className="flex gap-8 justify-center flex-wrap items-start">
                      {(roots.length > 0 ? roots : list).map((r) => (
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
                </div>
              )}
            </section>
          );
        })}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {target?.name}</DialogTitle>
            <DialogDescription>Change role, department, branch, reporting line and description.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Designation</Label><Input value={designation} onChange={(e) => setDesignation(e.target.value)} /></div>
            <div><Label>Department</Label><Input value={department} onChange={(e) => setDepartment(e.target.value)} /></div>
            <div>
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Unassigned —</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} · {b.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reports to</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger><SelectValue placeholder="No manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Top of company —</SelectItem>
                  {employees.filter((e) => e.id !== target?.id).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} · {e.designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">A manager can have any number of direct reports.</p>
            </div>
            <div className="col-span-2">
              <Label>About / job summary</Label>
              <Textarea rows={4} value={about} onChange={(e) => setAbout(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-gradient-brand text-white">Save changes</Button>
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
  const kids = childrenOf.get(emp.id) ?? [];
  const manager = emp.managerId ? byId.get(emp.managerId) : undefined;
  const isCollapsed = collapsed.has(emp.id) && kids.length > 0;
  const dim = matchIds && !matchIds.has(emp.id);

  // Chunk kids so wide teams wrap into rows of at most 6 columns per level
  const CHUNK = 6;
  const rows: Employee[][] = [];
  if (!isCollapsed && kids.length > 0) {
    for (let i = 0; i < kids.length; i += CHUNK) rows.push(kids.slice(i, i + CHUNK));
  }

  return (
    <div className={`flex flex-col items-center ${dim ? "opacity-40" : ""}`}>
      <div className="relative">
        <NameBadge emp={emp} manager={manager} directs={kids} onEdit={onEdit} branchName={branchName} />
        {kids.length > 0 && (
          <button
            onClick={() => toggleCollapsed(emp.id)}
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-soft hover:scale-110 transition-transform z-10"
            title={isCollapsed ? `Expand ${kids.length} report${kids.length > 1 ? "s" : ""}` : "Collapse team"}
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
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

function NameBadge({ emp, manager, directs, onEdit, branchName }: {
  emp: Employee; manager?: Employee; directs: Employee[]; onEdit: (e: Employee) => void; branchName?: string;
}) {
  const teamSize = directs.length;
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <div className={`w-[14rem] rounded-xl border bg-card p-3 shadow-soft hover:shadow-glow transition-all cursor-pointer group relative ${teamSize > 0 ? "border-primary/40" : "border-border"}`}>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full ring-2 ring-primary/30 bg-primary/10 text-primary grid place-items-center overflow-hidden shrink-0">
              {emp.photoDataUrl ? <img src={emp.photoDataUrl} className="h-full w-full object-cover" alt={emp.name} /> : <span className="font-semibold">{initials(emp.name)}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{emp.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{emp.designation}</div>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => { e.stopPropagation(); onEdit(emp); }}>
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
          <div className="mt-2 flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">{emp.department}</Badge>
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">{emp.empCode}</Badge>
            {teamSize > 0 && (
              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] py-0 px-1.5 flex items-center gap-0.5">
                <Users className="h-2.5 w-2.5" /> {teamSize}
              </Badge>
            )}
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
              <div className="font-semibold truncate">{emp.name}</div>
              <div className="text-xs text-muted-foreground truncate">{emp.designation} · {emp.department}</div>
              <div className="text-[11px] text-muted-foreground">Emp Code {emp.empCode} · Joined {emp.doj}</div>
            </div>
          </div>
          {emp.about && <p className="text-xs leading-relaxed text-muted-foreground border-l-2 border-primary/40 pl-2.5 italic">{emp.about}</p>}
          <div className="grid grid-cols-1 gap-1 text-xs">
            {emp.email && <div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3 w-3" /> {emp.email}</div>}
            {emp.phone && <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3 w-3" /> {emp.phone}</div>}
            {branchName && <div className="flex items-center gap-1.5 text-muted-foreground"><Building2 className="h-3 w-3" /> {branchName}</div>}
          </div>
          <div className="rounded-lg bg-muted/40 p-2.5 space-y-2">
            <div className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">Reporting line</div>
            <div className="flex items-start gap-2 text-xs">
              <ArrowUp className="h-3.5 w-3.5 text-primary mt-0.5" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase text-muted-foreground">Reports to</div>
                {manager ? <div className="truncate"><span className="font-medium">{manager.name}</span> · {manager.designation}</div> : <div className="text-muted-foreground italic">Top of company</div>}
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <ArrowDown className="h-3.5 w-3.5 text-coral mt-0.5" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase text-muted-foreground">Direct reports · {directs.length}</div>
                {directs.length === 0 ? <div className="text-muted-foreground italic">No direct reports</div> : (
                  <ul className="space-y-0.5 max-h-40 overflow-y-auto pr-1">
                    {directs.map((d) => <li key={d.id} className="truncate"><span className="font-medium">{d.name}</span> · <span className="text-muted-foreground">{d.designation}</span></li>)}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={() => onEdit(emp)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * VirtualGrid — windowed row virtualization for the grid view.
 * Only rows in (or near) the viewport render, so a 5,000-employee grid
 * still keeps DOM node counts and paint work bounded.
 */
function VirtualGrid({
  list, byId, cmap, onEdit, branchName, matchIds,
}: {
  list: Employee[];
  byId: Map<string, Employee>;
  cmap: Map<string | undefined, Employee[]>;
  onEdit: (e: Employee) => void;
  branchName?: string;
  matchIds: Set<string> | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cols, setCols] = useState(4);
  const [scrollMargin, setScrollMargin] = useState(0);
  const MIN_COL = 240;
  const GAP = 12;
  const ROW_H = 108;

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const measure = () => {
      const w = el.clientWidth;
      setCols(Math.max(1, Math.floor((w + GAP) / (MIN_COL + GAP))));
      setScrollMargin(el.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("scroll", measure, { passive: true });
    return () => { ro.disconnect(); window.removeEventListener("scroll", measure); };
  }, []);

  const rowCount = Math.ceil(list.length / cols);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ROW_H,
    overscan: 4,
    scrollMargin,
  });

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const offset = (items[0]?.start ?? 0) - scrollMargin;

  return (
    <div ref={containerRef} className="relative" style={{ height: totalSize }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${offset}px)` }}>
        {items.map((row) => {
          const startIdx = row.index * cols;
          const rowItems = list.slice(startIdx, startIdx + cols);
          return (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              className="grid gap-3 pb-3"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {rowItems.map((e) => (
                <div key={e.id} className={matchIds && !matchIds.has(e.id) ? "opacity-40" : ""}>
                  <NameBadge
                    emp={e}
                    manager={e.managerId ? byId.get(e.managerId) : undefined}
                    directs={cmap.get(e.id) ?? []}
                    onEdit={onEdit}
                    branchName={branchName}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
