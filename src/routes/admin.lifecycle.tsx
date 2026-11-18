import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  GitBranch,
  UserPlus,
  Sparkles,
  TrendingUp,
  UserMinus,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Filter,
  ArrowRight,
  ShieldAlert,
  Send,
  Eye,
  FileText,
  Calendar,
  Building2,
  UserCheck,
  Award,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { ComingSoonOverlay } from "@/components/coming-soon-overlay";

export const Route = createFileRoute("/admin/lifecycle")({
  head: () => ({ meta: [{ title: "AI Employee Lifecycle · CreatonsHR" }] }),
  component: LifecyclePage,
});

type LifecycleStage = "all" | "onboarding" | "probation" | "movement" | "exit";

interface LifecycleRecord {
  id: string;
  empCode: string;
  name: string;
  department: string;
  designation: string;
  stage: "onboarding" | "probation" | "movement" | "exit";
  subStage: string;
  progressPercent: number;
  startDate: string;
  targetDate: string;
  aiRiskScore: "low" | "medium" | "high";
  aiSummary: string;
  manager: string;
  stepsCompleted: number;
  totalSteps: number;
  nextStepName: string;
}

const DUMMY_LIFECYCLE_DATA: LifecycleRecord[] = [
  {
    id: "lc-1",
    empCode: "SW-0104",
    name: "Aakash Verma",
    department: "Engineering",
    designation: "Frontend Engineer II",
    stage: "onboarding",
    subStage: "Day 7: IT Setup & Orientation",
    progressPercent: 65,
    startDate: "2026-11-10",
    targetDate: "2026-11-25",
    aiRiskScore: "low",
    aiSummary: "On-track: Laptop and credentials provisioned; 4/6 onboarding tasks completed.",
    manager: "Kavita Rao",
    stepsCompleted: 4,
    totalSteps: 6,
    nextStepName: "1-on-1 Buddy Introduction",
  },
  {
    id: "lc-2",
    empCode: "SW-0089",
    name: "Meera Krishnan",
    department: "Product",
    designation: "Associate Product Manager",
    stage: "probation",
    subStage: "90-Day Performance Review",
    progressPercent: 85,
    startDate: "2026-08-15",
    targetDate: "2026-11-20",
    aiRiskScore: "low",
    aiSummary: "AI Assessment: Exceeds attendance expectations (99.2%). Recommended for permanent confirmation.",
    manager: "Suresh Menon",
    stepsCompleted: 5,
    totalSteps: 6,
    nextStepName: "HOD Sign-off & Confirmation Letter",
  },
  {
    id: "lc-3",
    empCode: "SW-0052",
    name: "Rohan Kulkarni",
    department: "Sales",
    designation: "Senior Territory Executive",
    stage: "movement",
    subStage: "Promotion to Area Manager",
    progressPercent: 40,
    startDate: "2026-11-01",
    targetDate: "2026-12-01",
    aiRiskScore: "low",
    aiSummary: "Compensation revision drafted; awaiting Director approval and revised KRA sign-off.",
    manager: "Vikram Malhotra",
    stepsCompleted: 2,
    totalSteps: 5,
    nextStepName: "Compensation Matrix Approval",
  },
  {
    id: "lc-4",
    empCode: "SW-0041",
    name: "Pooja Hegde",
    department: "Operations",
    designation: "Supply Chain Analyst",
    stage: "exit",
    subStage: "Notice Period: Handover & Clearance",
    progressPercent: 70,
    startDate: "2026-10-20",
    targetDate: "2026-11-25",
    aiRiskScore: "medium",
    aiSummary: "2 Asset handovers pending (MacBook Pro & Access Fob); IT Clearance outstanding.",
    manager: "Ananya Deshmukh",
    stepsCompleted: 4,
    totalSteps: 6,
    nextStepName: "Hardware Repository Return",
  },
  {
    id: "lc-5",
    empCode: "SW-0112",
    name: "Devendra Saini",
    department: "Quality & Plant",
    designation: "Plant Safety Officer",
    stage: "onboarding",
    subStage: "Day 1: Documentation & Medicals",
    progressPercent: 20,
    startDate: "2026-11-17",
    targetDate: "2026-11-30",
    aiRiskScore: "low",
    aiSummary: "Statutory forms submitted; waiting for bank account verification and EPFO linkage.",
    manager: "Kailash Patel",
    stepsCompleted: 1,
    totalSteps: 5,
    nextStepName: "Bank Passbook Verification",
  },
  {
    id: "lc-6",
    empCode: "SW-0078",
    name: "Naveen Chawla",
    department: "Customer Success",
    designation: "Support Team Lead",
    stage: "probation",
    subStage: "60-Day Mid-Probation Check",
    progressPercent: 50,
    startDate: "2026-09-18",
    targetDate: "2026-11-28",
    aiRiskScore: "medium",
    aiSummary: "Manager feedback recorded 3.8/5. Recommend peer pulse check before final review.",
    manager: "Priya Sundaram",
    stepsCompleted: 3,
    totalSteps: 6,
    nextStepName: "Peer Feedback Survey Trigger",
  },
  {
    id: "lc-7",
    empCode: "SW-0063",
    name: "Swati Deshpande",
    department: "Human Resources",
    designation: "Talent Acquisition Specialist",
    stage: "movement",
    subStage: "Lateral Department Transfer",
    progressPercent: 90,
    startDate: "2026-10-15",
    targetDate: "2026-11-20",
    aiRiskScore: "low",
    aiSummary: "HRBP transition completed; updated org hierarchy reporting to HR Director.",
    manager: "Rahul Sharma",
    stepsCompleted: 4,
    totalSteps: 5,
    nextStepName: "System Role Access Migration",
  },
];

function LifecyclePage() {
  const { employees } = useStore();
  const [activeTab, setActiveTab] = useState<LifecycleStage>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<LifecycleRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [initiateOpen, setInitiateOpen] = useState(false);

  // New Journey Form State
  const [newEmpCode, setNewEmpCode] = useState("");
  const [newStage, setNewStage] = useState<"onboarding" | "probation" | "movement" | "exit">("probation");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const filteredRecords = useMemo(() => {
    return DUMMY_LIFECYCLE_DATA.filter((r) => {
      const matchesTab = activeTab === "all" || r.stage === activeTab;
      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.empCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.designation.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === "all" || r.department === departmentFilter;
      return matchesTab && matchesSearch && matchesDept;
    });
  }, [activeTab, searchQuery, departmentFilter]);

  const stats = useMemo(() => {
    const total = DUMMY_LIFECYCLE_DATA.length;
    const onboarding = DUMMY_LIFECYCLE_DATA.filter((r) => r.stage === "onboarding").length;
    const probation = DUMMY_LIFECYCLE_DATA.filter((r) => r.stage === "probation").length;
    const movement = DUMMY_LIFECYCLE_DATA.filter((r) => r.stage === "movement").length;
    const exit = DUMMY_LIFECYCLE_DATA.filter((r) => r.stage === "exit").length;
    return { total, onboarding, probation, movement, exit };
  }, []);

  const handleInitiateJourney = () => {
    if (!newEmpCode) {
      toast.error("Please select an employee");
      return;
    }
    toast.success("AI Lifecycle workflow initiated successfully", {
      description: `Automated timeline and milestone triggers created for ${newEmpCode}.`,
    });
    setInitiateOpen(false);
    setNewEmpCode("");
    setNewNotes("");
  };

  const handleTriggerAiAction = (record: LifecycleRecord) => {
    toast.success(`Triggered next step: ${record.nextStepName}`, {
      description: `AI automated email & task reminder sent to ${record.manager}.`,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 relative">
      <ComingSoonOverlay delayMs={700} />
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>AI Employee Lifecycle</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                Autonomous Copilot
              </Badge>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Automate onboarding pipelines, probation evaluations, promotions, and exit clearances with intelligent predictive copilots.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setInitiateOpen(true)}
            className="h-9 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Initiate Journey
          </Button>
        </div>
      </div>

      {/* AI Copilot Smart Insight Banner */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-xs shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>AI Predictive Recommendation</span>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                High Confidence
              </Badge>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Meera Krishnan (SW-0089) has completed 90 days with 99.2% attendance and 4.8/5 manager ratings. Confirmation letter is ready for auto-generation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info("Confirmation letter preview loaded in composer")}
            className="h-8 px-3 rounded-lg text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
          >
            Review Confirmation
          </Button>
          <Button
            size="sm"
            onClick={() => toast.success("Automated confirmation sign-off dispatched to HR Director")}
            className="h-8 px-3 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Auto-Approve
          </Button>
        </div>
      </div>

      {/* Key Metric Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">All Journeys</span>
            <GitBranch className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <span className="text-[11px] text-muted-foreground">Active in pipeline</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Onboarding</span>
            <UserPlus className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.onboarding}</p>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">New joiners</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Probation</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.probation}</p>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Reviews due</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Movements</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.movement}</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Promotions / transfers</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Offboarding</span>
            <UserMinus className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.exit}</p>
          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Exit clearances</span>
        </div>
      </div>

      {/* Top Frosted Capsule Tab Bar (Left-aligned) */}
      <div className="flex items-center justify-start gap-4 flex-wrap pb-1">
        <div className="inline-flex items-center gap-1 p-1 sm:gap-1.5 sm:p-1.5 rounded-full border border-border/60 bg-card/75 dark:bg-card/50 backdrop-blur-xl shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "all" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "all" && (
              <motion.div
                layoutId="lifecycleSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <GitBranch className="h-4 w-4 shrink-0" />
              <span>All ({stats.total})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("onboarding")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "onboarding" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "onboarding" && (
              <motion.div
                layoutId="lifecycleSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <UserPlus className="h-4 w-4 shrink-0" />
              <span>Onboarding ({stats.onboarding})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("probation")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "probation" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "probation" && (
              <motion.div
                layoutId="lifecycleSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>Probation ({stats.probation})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("movement")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "movement" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "movement" && (
              <motion.div
                layoutId="lifecycleSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span>Movements ({stats.movement})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("exit")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "exit" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "exit" && (
              <motion.div
                layoutId="lifecycleSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <UserMinus className="h-4 w-4 shrink-0" />
              <span>Offboarding ({stats.exit})</span>
            </span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee, ID, role..."
            className="h-9 pl-9 rounded-xl text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="h-9 w-full sm:w-44 rounded-xl text-xs bg-background">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="Engineering">Engineering</SelectItem>
              <SelectItem value="Product">Product</SelectItem>
              <SelectItem value="Sales">Sales</SelectItem>
              <SelectItem value="Operations">Operations</SelectItem>
              <SelectItem value="Human Resources">Human Resources</SelectItem>
              <SelectItem value="Quality & Plant">Quality & Plant</SelectItem>
              <SelectItem value="Customer Success">Customer Success</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setDepartmentFilter("all");
            }}
            className="h-9 px-3 rounded-xl text-xs font-semibold"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Main Lifecycle Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Department & Role</th>
                <th className="py-3.5 px-4">Journey & Milestone</th>
                <th className="py-3.5 px-4">Progress</th>
                <th className="py-3.5 px-4">AI Assessment</th>
                <th className="py-3.5 px-4">Next Automated Action</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No active lifecycle journeys match your filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                          {item.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-xs">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground">{item.empCode}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-medium text-foreground">{item.designation}</p>
                      <p className="text-[11px] text-muted-foreground">{item.department}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize text-[10px] font-semibold px-2 py-0.5",
                            item.stage === "onboarding" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                            item.stage === "probation" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                            item.stage === "movement" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                            item.stage === "exit" && "bg-rose-500/10 text-rose-600 border-rose-500/20"
                          )}
                        >
                          {item.stage}
                        </Badge>
                        <p className="text-[11px] font-medium text-foreground">{item.subStage}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="w-32 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{item.progressPercent}%</span>
                          <span>{item.stepsCompleted}/{item.totalSteps} steps</span>
                        </div>
                        <Progress value={item.progressPercent} className="h-1.5" />
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              item.aiRiskScore === "low" ? "bg-emerald-500" : item.aiRiskScore === "medium" ? "bg-amber-500" : "bg-rose-500"
                            )}
                          />
                          <span className="text-[11px] font-semibold capitalize text-foreground">
                            {item.aiRiskScore} Risk
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.aiSummary}
                        </p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-primary shrink-0" />
                          <span>{item.nextStepName}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">Due by {item.targetDate}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRecord(item);
                            setDetailOpen(true);
                          }}
                          className="h-8 px-2.5 rounded-lg text-xs"
                          title="View Journey Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleTriggerAiAction(item)}
                          className="h-8 px-3 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                        >
                          Run Next
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Journey Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-xl">
          {selectedRecord && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary font-bold text-sm">
                    {selectedRecord.empCode}
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold">{selectedRecord.name} — Lifecycle Journey</DialogTitle>
                    <DialogDescription className="text-xs">
                      {selectedRecord.designation} · {selectedRecord.department} (Manager: {selectedRecord.manager})
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Current Stage: {selectedRecord.subStage}</span>
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {selectedRecord.stage}
                    </Badge>
                  </div>
                  <Progress value={selectedRecord.progressPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground">{selectedRecord.aiSummary}</p>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Milestone Roadmap</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">Stage Initiated & Profile Synced</p>
                        <p className="text-[10px] text-muted-foreground">Completed on {selectedRecord.startDate}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10">Passed</Badge>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">Manager 1-on-1 Feedback Logged</p>
                        <p className="text-[10px] text-muted-foreground">Recorded by {selectedRecord.manager}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10">Done</Badge>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                      <Clock className="h-4 w-4 text-primary shrink-0 animate-pulse" />
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{selectedRecord.nextStepName}</p>
                        <p className="text-[10px] text-muted-foreground">Scheduled deadline: {selectedRecord.targetDate}</p>
                      </div>
                      <Badge className="text-[10px] bg-primary text-primary-foreground">In Progress</Badge>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-dashed border-border text-xs opacity-60">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-muted-foreground">Final Closure & Letter Issuance</p>
                        <p className="text-[10px] text-muted-foreground">Pending prior milestone sign-off</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Upcoming</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
                <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)} className="text-xs">
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleTriggerAiAction(selectedRecord);
                    setDetailOpen(false);
                  }}
                  className="text-xs font-bold bg-primary text-primary-foreground"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Execute Next Step
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Initiate New Journey Modal */}
      <Dialog open={initiateOpen} onOpenChange={setInitiateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Initiate Employee Lifecycle Journey</DialogTitle>
            <DialogDescription className="text-xs">
              Configure an autonomous track with milestone checkpoints, review forms, and document triggers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Select Employee</label>
              <Select value={newEmpCode} onValueChange={setNewEmpCode}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.empCode || e.id}>
                      {e.name} ({e.empCode || "EMP"}) — {e.designation}
                    </SelectItem>
                  ))}
                  <SelectItem value="SW-0120">Pooja Nambiar (SW-0120) — QA Engineer</SelectItem>
                  <SelectItem value="SW-0121">Rakesh Shetty (SW-0121) — Production Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Lifecycle Track</label>
              <Select value={newStage} onValueChange={(v: any) => setNewStage(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onboarding">New Hire Onboarding Pipeline</SelectItem>
                  <SelectItem value="probation">Probation Review & Confirmation</SelectItem>
                  <SelectItem value="movement">Promotion / Lateral Career Movement</SelectItem>
                  <SelectItem value="exit">Resignation & Exit Clearance Track</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Target Completion Date</label>
              <Input
                type="date"
                value={newTargetDate}
                onChange={(e) => setNewTargetDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">AI Instructions / Custom Objectives</label>
              <Input
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="e.g. Schedule review with Regional VP on day 45..."
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInitiateOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleInitiateJourney} className="text-xs font-bold bg-primary text-primary-foreground">
              Launch Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
