import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useStore,
  type GrievanceTicket,
  type GrievanceMessage,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageSquareHeart, Search, Filter, Plus, Send, CheckCircle2,
  Clock, AlertTriangle, XCircle, ArrowUpRight, UserCheck, ShieldAlert,
  Calendar, Building2, Tag, FileText, Paperclip, MessageSquare
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/grievances")({
  head: () => ({ meta: [{ title: "Grievances & Employee Tickets · SWIFT" }] }),
  component: GrievancesPage,
});

function initials(name: string) {
  return (name || "").split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}

function GrievancesPage() {
  const { grievances, addGrievance, updateGrievance, addGrievanceMessage, employees, currentUser, company } = useStore();

  const categories = useMemo(() => {
    const types = company.grievanceTypes && company.grievanceTypes.length > 0 ? company.grievanceTypes : [
      { id: "grv-1", name: "Attendance Related", active: true },
      { id: "grv-2", name: "Leave Permission", active: true },
      { id: "grv-3", name: "Salary / Payroll", active: true },
      { id: "grv-4", name: "Manager Behavior", active: true },
      { id: "grv-5", name: "Workplace Issues", active: true },
      { id: "grv-6", name: "Policy Violation", active: true },
      { id: "grv-7", name: "Benefits & Claims", active: true },
      { id: "grv-8", name: "Others", active: true },
    ];
    return types.filter((t) => t.active !== false);
  }, [company.grievanceTypes]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Selected ticket for chat / details
  const [selectedTicket, setSelectedTicket] = useState<GrievanceTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");

  // Create Ticket Dialog (Admin on behalf of employee)
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [newCategory, setNewCategory] = useState("Salary / Payroll");
  const [newPriority, setNewPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignedRole, setNewAssignedRole] = useState("HR Manager");

  const filteredTickets = useMemo(() => {
    return (grievances || []).filter((g) => {
      const q = query.toLowerCase().trim();
      const matchQuery =
        !q ||
        g.ticketNumber.toLowerCase().includes(q) ||
        g.employeeName.toLowerCase().includes(q) ||
        g.subject.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q);

      const matchStatus = statusFilter === "all" || g.status.toLowerCase() === statusFilter.toLowerCase();
      const matchCategory = categoryFilter === "all" || g.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchPriority = priorityFilter === "all" || g.priority.toLowerCase() === priorityFilter.toLowerCase();

      return matchQuery && matchStatus && matchCategory && matchPriority;
    });
  }, [grievances, query, statusFilter, categoryFilter, priorityFilter]);

  // Metrics
  const stats = useMemo(() => {
    const list = grievances || [];
    const total = list.length;
    const open = list.filter((g) => g.status === "Open").length;
    const inProgress = list.filter((g) => g.status === "In Progress").length;
    const resolved = list.filter((g) => g.status === "Resolved").length;
    const critical = list.filter((g) => g.priority === "Critical" && g.status !== "Resolved").length;
    return { total, open, inProgress, resolved, critical };
  }, [grievances]);

  function handleSendReply() {
    if (!selectedTicket || !replyMessage.trim()) return;
    const actorName = currentUser?.name || "HR Admin";
    const actorRole = currentUser?.role === "admin" ? "HR Department" : "Management";

    addGrievanceMessage(selectedTicket.id, {
      senderId: currentUser?.employeeId || "admin",
      senderName: actorName,
      senderRole: actorRole,
      message: replyMessage.trim(),
    });

    if (selectedTicket.status === "Open") {
      updateGrievance(selectedTicket.id, { status: "In Progress" });
    }

    setReplyMessage("");
    toast.success("Message posted to grievance thread");

    // Refresh active ticket
    const refreshed = grievances.find((g) => g.id === selectedTicket.id);
    if (refreshed) setSelectedTicket(refreshed);
  }

  function handleStatusChange(newStatus: "Open" | "In Progress" | "Resolved" | "Rejected") {
    if (!selectedTicket) return;
    const actorName = currentUser?.name || "HR Admin";
    const patch: Partial<GrievanceTicket> = {
      status: newStatus,
      resolutionNote: newStatus === "Resolved" || newStatus === "Rejected" ? resolutionNote : selectedTicket.resolutionNote,
      resolvedAt: newStatus === "Resolved" || newStatus === "Rejected" ? new Date().toISOString() : undefined,
      resolvedBy: newStatus === "Resolved" || newStatus === "Rejected" ? actorName : undefined,
    };
    updateGrievance(selectedTicket.id, patch);
    toast.success(`Ticket status updated to ${newStatus}`);
    setSelectedTicket({ ...selectedTicket, ...patch });
  }

  function handleCreateTicket() {
    if (!newEmployeeId) return toast.error("Please select an employee");
    if (!newSubject.trim()) return toast.error("Subject is required");
    if (!newDescription.trim()) return toast.error("Description is required");

    const emp = employees.find((e) => e.id === newEmployeeId);
    if (!emp) return;

    addGrievance({
      ticketNumber: `GRV-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
      employeeId: emp.id,
      employeeName: emp.name,
      empCode: emp.empCode,
      department: emp.department,
      category: newCategory,
      priority: newPriority,
      assignedRole: newAssignedRole,
      subject: newSubject.trim(),
      description: newDescription.trim(),
      status: "Open",
      thread: [
        {
          id: crypto.randomUUID(),
          senderId: emp.id,
          senderName: emp.name,
          senderRole: "Employee",
          message: newDescription.trim(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    toast.success("Grievance ticket created successfully");
    setCreateOpen(false);
    setNewSubject("");
    setNewDescription("");
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
            <MessageSquareHeart className="h-6 w-6 text-primary" /> Grievance Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Track, respond to, and resolve employee requests and grievances across the multi-level hierarchy.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-soft"
        >
          <Plus className="h-4 w-4" /> Raise Ticket
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-soft">
          <div className="text-xs text-muted-foreground font-medium">Total Tickets</div>
          <div className="text-2xl font-bold text-foreground mt-1">{stats.total}</div>
        </div>
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-soft">
          <div className="text-xs text-amber-600 font-medium">Open</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats.open}</div>
        </div>
        <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 shadow-soft">
          <div className="text-xs text-blue-600 font-medium">In Progress</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</div>
        </div>
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-soft">
          <div className="text-xs text-emerald-600 font-medium">Resolved</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.resolved}</div>
        </div>
        <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/5 shadow-soft col-span-2 sm:col-span-1">
          <div className="text-xs text-red-600 font-medium">Critical Issues</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{stats.critical}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl border border-border bg-card flex flex-wrap items-center justify-between gap-3 shadow-soft">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ticket #, employee, subject..."
            className="pl-9 h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
          <MessageSquareHeart className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-60" />
          <h3 className="font-semibold text-base text-foreground">No Grievance Tickets Found</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Employees can raise tickets through the mobile app or HR portal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTickets.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTicket(t)}
              className="p-5 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer shadow-soft hover:shadow-glow flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
                  <span className="font-mono text-xs font-bold text-primary">{t.ticketNumber}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      className={`text-[10px] ${
                        t.priority === "Critical"
                          ? "bg-red-500/15 text-red-600 border-red-500/30"
                          : t.priority === "High"
                          ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                          : "bg-blue-500/15 text-blue-600 border-blue-500/30"
                      }`}
                    >
                      {t.priority}
                    </Badge>
                    <Badge
                      className={`text-[10px] ${
                        t.status === "Resolved"
                          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                          : t.status === "In Progress"
                          ? "bg-blue-500/15 text-blue-600 border-blue-500/30"
                          : t.status === "Rejected"
                          ? "bg-gray-500/15 text-gray-600 border-gray-500/30"
                          : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                      }`}
                    >
                      {t.status}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3">
                  <h4 className="font-semibold text-sm text-foreground line-clamp-1">{t.subject}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] grid place-items-center">
                    {initials(t.employeeName)}
                  </div>
                  <span className="font-medium text-foreground truncate max-w-[120px]">{t.employeeName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{t.thread?.length || 1} msgs</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Details & Chat Modal */}
      {selectedTicket && (
        <Dialog open={Boolean(selectedTicket)} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-border bg-card">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-primary">{selectedTicket.ticketNumber}</span>
                  <Badge variant="outline" className="text-xs">{selectedTicket.category}</Badge>
                  <Badge
                    className={`text-xs ${
                      selectedTicket.priority === "Critical"
                        ? "bg-red-500/15 text-red-600"
                        : "bg-blue-500/15 text-blue-600"
                    }`}
                  >
                    {selectedTicket.priority} Priority
                  </Badge>
                </div>

                <Select
                  value={selectedTicket.status}
                  onValueChange={(val) => handleStatusChange(val as any)}
                >
                  <SelectTrigger className="w-36 h-8 text-xs font-semibold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <h3 className="font-display font-semibold text-lg text-foreground mt-2">
                {selectedTicket.subject}
              </h3>

              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                <span>Raised by <b className="text-foreground">{selectedTicket.employeeName}</b> ({selectedTicket.empCode})</span>
                <span>•</span>
                <span>{selectedTicket.department}</span>
                <span>•</span>
                <span>{new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Conversation Thread */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-muted/20">
              {(selectedTicket.thread || []).map((msg) => {
                const isEmployee = msg.senderRole === "Employee";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isEmployee ? "items-start" : "items-end"}`}
                  >
                    <div className="text-[11px] text-muted-foreground mb-1 px-1 flex items-center gap-2">
                      <span className="font-semibold text-foreground">{msg.senderName}</span>
                      <span>({msg.senderRole})</span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div
                      className={`p-3.5 rounded-2xl max-w-[85%] text-xs shadow-soft ${
                        isEmployee
                          ? "bg-card border border-border text-foreground rounded-tl-sm"
                          : "bg-primary text-primary-foreground rounded-tr-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Bar */}
            <div className="p-4 border-t border-border bg-card space-y-3">
              <div className="flex items-center gap-2">
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type a response or resolution note..."
                  className="h-16 text-xs resize-none"
                />
                <Button
                  onClick={handleSendReply}
                  className="h-16 px-4 bg-primary text-primary-foreground"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Ticket Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Grievance Ticket</DialogTitle>
            <DialogDescription>Submit a new grievance or escalation ticket on behalf of an employee.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={newEmployeeId} onValueChange={setNewEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.empCode}) · {e.department}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={newPriority} onValueChange={(v) => setNewPriority(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Brief summary of the issue..." />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Detailed explanation..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTicket} className="bg-emerald-600 text-white">Create Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
