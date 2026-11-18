import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Package,
  Laptop,
  Radio,
  Smartphone,
  Cpu,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Building2,
  RefreshCw,
  QrCode,
  Tag,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/admin/assets")({
  head: () => ({ meta: [{ title: "Asset Management & Inventory · CreatonsHR" }] }),
  component: AssetsPage,
});

type AssetCategory = "all" | "laptop" | "biometric" | "mobile" | "facility";

interface AssetRecord {
  id: string;
  assetTag: string;
  name: string;
  category: "laptop" | "biometric" | "mobile" | "facility";
  serialNo: string;
  assignedTo: string | null;
  assignedEmpCode: string | null;
  branch: string;
  purchaseDate: string;
  warrantyExpiry: string;
  condition: "new" | "good" | "maintenance";
  value: string;
}

const ASSET_INVENTORY: AssetRecord[] = [
  {
    id: "ast-01",
    assetTag: "AST-LAP-001",
    name: 'Apple MacBook Pro 14" (M3 Pro / 18GB / 512GB)',
    category: "laptop",
    serialNo: "C02XYZ8912P",
    assignedTo: "Manoj Kumar",
    assignedEmpCode: "SW-001",
    branch: "Head Office",
    purchaseDate: "2025-01-15",
    warrantyExpiry: "2028-01-14",
    condition: "new",
    value: "₹ 1,99,900",
  },
  {
    id: "ast-02",
    assetTag: "AST-LAP-002",
    name: "Dell Latitude 5440 (i7 13th Gen / 16GB / 512GB)",
    category: "laptop",
    serialNo: "DL889104A",
    assignedTo: "Aakash Verma",
    assignedEmpCode: "SW-003",
    branch: "Chennai Plant",
    purchaseDate: "2025-06-10",
    warrantyExpiry: "2028-06-09",
    condition: "good",
    value: "₹ 84,500",
  },
  {
    id: "ast-03",
    assetTag: "AST-LAP-003",
    name: "Lenovo ThinkPad T14 Gen 4 (AMD Ryzen 7 / 32GB)",
    category: "laptop",
    serialNo: "PF392811B",
    assignedTo: "Priya Sundaram",
    assignedEmpCode: "SW-002",
    branch: "Head Office",
    purchaseDate: "2024-11-20",
    warrantyExpiry: "2027-11-19",
    condition: "good",
    value: "₹ 1,12,000",
  },
  {
    id: "ast-04",
    assetTag: "AST-BIO-001",
    name: "ZKTeco ProCapture-T Biometric Time Terminal",
    category: "biometric",
    serialNo: "ZK-TN-9920",
    assignedTo: null,
    assignedEmpCode: null,
    branch: "Head Office Entrance",
    purchaseDate: "2024-03-12",
    warrantyExpiry: "2027-03-11",
    condition: "good",
    value: "₹ 38,000",
  },
  {
    id: "ast-05",
    assetTag: "AST-BIO-002",
    name: "Realtime RS-485 Face Recognition Terminal",
    category: "biometric",
    serialNo: "RT-CH-4412",
    assignedTo: null,
    assignedEmpCode: null,
    branch: "Chennai Factory Gate",
    purchaseDate: "2025-02-01",
    warrantyExpiry: "2028-01-31",
    condition: "good",
    value: "₹ 45,000",
  },
  {
    id: "ast-06",
    assetTag: "AST-MOB-001",
    name: "Samsung Galaxy Tab A9+ (Kiosk Attendance Terminal)",
    category: "mobile",
    serialNo: "SM-X210-911",
    assignedTo: "Kailash Patel",
    assignedEmpCode: "SW-010",
    branch: "Chennai Plant",
    purchaseDate: "2025-07-15",
    warrantyExpiry: "2026-07-14",
    condition: "good",
    value: "₹ 21,999",
  },
  {
    id: "ast-07",
    assetTag: "AST-LAP-004",
    name: "HP EliteBook 840 G10 (i5 13th Gen / 16GB)",
    category: "laptop",
    serialNo: "HP991823C",
    assignedTo: null,
    assignedEmpCode: null,
    branch: "Head Office IT Pool",
    purchaseDate: "2025-09-01",
    warrantyExpiry: "2028-08-31",
    condition: "new",
    value: "₹ 78,000",
  },
  {
    id: "ast-08",
    assetTag: "AST-FAC-001",
    name: "Cisco Catalyst 1000 Series 24-Port Gigabit Switch",
    category: "facility",
    serialNo: "FOC2419X01",
    assignedTo: null,
    assignedEmpCode: null,
    branch: "Head Office Server Rack",
    purchaseDate: "2024-05-10",
    warrantyExpiry: "2029-05-09",
    condition: "good",
    value: "₹ 62,000",
  },
];

function AssetsPage() {
  const { employees } = useStore();
  const [activeTab, setActiveTab] = useState<AssetCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [targetEmp, setTargetEmp] = useState("");

  // New Asset State
  const [newTag, setNewTag] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<AssetCategory>("laptop");
  const [newSerial, setNewSerial] = useState("");
  const [newBranch, setNewBranch] = useState("Head Office");
  const [newValue, setNewValue] = useState("");

  const filteredAssets = useMemo(() => {
    return ASSET_INVENTORY.filter((ast) => {
      const matchesTab = activeTab === "all" || ast.category === activeTab;
      const matchesSearch =
        ast.assetTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ast.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ast.serialNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ast.assignedTo && ast.assignedTo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        ast.branch.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

  const stats = useMemo(() => {
    const total = ASSET_INVENTORY.length;
    const allocated = ASSET_INVENTORY.filter((a) => a.assignedTo !== null).length;
    const inStock = ASSET_INVENTORY.filter((a) => a.assignedTo === null).length;
    const maintenance = ASSET_INVENTORY.filter((a) => a.condition === "maintenance").length;
    return { total, allocated, inStock, maintenance };
  }, []);

  const handleAllocate = () => {
    if (!targetEmp) {
      toast.error("Please select an employee");
      return;
    }
    toast.success(`Allocated ${selectedAsset?.assetTag} to ${targetEmp}`, {
      description: "Digital handover acknowledgement sent to employee email.",
    });
    setAllocateModalOpen(false);
    setSelectedAsset(null);
    setTargetEmp("");
  };

  const handleAddNewAsset = () => {
    if (!newTag.trim() || !newName.trim()) {
      toast.error("Please enter asset tag and name");
      return;
    }
    toast.success(`Added ${newTag} to inventory`, {
      description: "QR code asset tag generated and logged in hardware registry.",
    });
    setNewModalOpen(false);
    setNewTag("");
    setNewName("");
    setNewSerial("");
    setNewValue("");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 relative min-h-[calc(100vh-10rem)]">
      <ComingSoonOverlay delayMs={700} />
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Asset Management & Inventory</span>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
              Hardware Registry
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track company laptops, biometric time clocks, network switches, and employee hardware allocations across branches.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setNewModalOpen(true)}
            className="h-9 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Asset
          </Button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Assets</span>
            <Package className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <span className="text-[11px] text-muted-foreground">Company hardware registry</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Allocated</span>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.allocated}</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">In staff possession</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">In Stock (Available)</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inStock}</p>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Ready for deployment</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Maintenance / Repair</span>
            <Wrench className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.maintenance}</p>
          <span className="text-[11px] text-muted-foreground">Warranty servicing</span>
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
                layoutId="assetsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Package className="h-4 w-4 shrink-0" />
              <span>All Assets ({stats.total})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("laptop")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "laptop" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "laptop" && (
              <motion.div
                layoutId="assetsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Laptop className="h-4 w-4 shrink-0" />
              <span>Laptops & MacBooks</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("biometric")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "biometric" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "biometric" && (
              <motion.div
                layoutId="assetsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Radio className="h-4 w-4 shrink-0" />
              <span>Biometric Terminals</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mobile")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "mobile" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "mobile" && (
              <motion.div
                layoutId="assetsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Smartphone className="h-4 w-4 shrink-0" />
              <span>Kiosk Tablets</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("facility")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "facility" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "facility" && (
              <motion.div
                layoutId="assetsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Cpu className="h-4 w-4 shrink-0" />
              <span>Network Infrastructure</span>
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
            placeholder="Search asset tag, serial, model, employee..."
            className="h-9 pl-9 rounded-xl text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <QrCode className="h-4 w-4 text-primary" />
          <span>All assets assigned unique encrypted QR barcodes</span>
        </div>
      </div>

      {/* Assets Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Asset Tag & Device</th>
                <th className="py-3.5 px-4">Serial Number</th>
                <th className="py-3.5 px-4">Branch Location</th>
                <th className="py-3.5 px-4">Current Allocation</th>
                <th className="py-3.5 px-4">Warranty Until</th>
                <th className="py-3.5 px-4">Condition</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAssets.map((ast) => (
                <tr key={ast.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary font-mono text-[10px] font-bold shrink-0">
                        {ast.assetTag}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-xs">{ast.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize mt-0.5">Asset Value: {ast.value}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {ast.serialNo}
                  </td>

                  <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                    {ast.branch}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {ast.assignedTo ? (
                      <div>
                        <p className="font-semibold text-foreground text-xs">{ast.assignedTo}</p>
                        <p className="text-[10px] text-muted-foreground">{ast.assignedEmpCode}</p>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-blue-600 bg-blue-500/10 border-blue-500/20">
                        Available in Stock
                      </Badge>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                    {ast.warrantyExpiry}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <Badge
                      className={cn(
                        "text-[10px] font-semibold capitalize",
                        ast.condition === "new" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                        ast.condition === "good" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                        ast.condition === "maintenance" && "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      )}
                    >
                      {ast.condition}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedAsset(ast);
                        setAllocateModalOpen(true);
                      }}
                      className="h-8 px-3 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                    >
                      {ast.assignedTo ? "Reassign" : "Allocate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocate Modal */}
      <Dialog open={allocateModalOpen} onOpenChange={setAllocateModalOpen}>
        <DialogContent className="max-w-md">
          {selectedAsset && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold">Assign Asset to Employee</DialogTitle>
                <DialogDescription className="text-xs">
                  Allocate {selectedAsset.name} ({selectedAsset.assetTag})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                <div className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-1">
                  <p className="font-semibold text-foreground">{selectedAsset.name}</p>
                  <p className="text-muted-foreground">Serial: {selectedAsset.serialNo}</p>
                  <p className="text-muted-foreground">Currently: {selectedAsset.assignedTo || "In Stock"}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Select Recipient Employee</label>
                  <Select value={targetEmp} onValueChange={setTargetEmp}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choose employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={`${e.name} (${e.empCode || "EMP"})`}>
                          {e.name} ({e.empCode || "EMP"}) — {e.designation}
                        </SelectItem>
                      ))}
                      <SelectItem value="Devendra Saini (SW-0112)">Devendra Saini (SW-0112) — Plant Safety Officer</SelectItem>
                      <SelectItem value="Pooja Hegde (SW-0041)">Pooja Hegde (SW-0041) — Supply Chain Analyst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setAllocateModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAllocate} className="text-xs font-bold bg-primary text-primary-foreground">
                  Confirm Handover
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add New Asset Modal */}
      <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Asset to Inventory</DialogTitle>
            <DialogDescription className="text-xs">
              Log new hardware device, serial number, and warranty terms.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Asset Tag Code</label>
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="AST-LAP-005"
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Category</label>
                <Select value={newCategory} onValueChange={(v: any) => setNewCategory(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laptop">Laptop / MacBook</SelectItem>
                    <SelectItem value="biometric">Biometric Device</SelectItem>
                    <SelectItem value="mobile">Tablet / Mobile</SelectItem>
                    <SelectItem value="facility">Network / Server</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Device Name & Model Specs</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. MacBook Air M3 16GB / 512GB..."
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Serial Number</label>
                <Input
                  value={newSerial}
                  onChange={(e) => setNewSerial(e.target.value)}
                  placeholder="S/N 99824A"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Purchase Cost</label>
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="₹ 95,000"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Branch Allocation</label>
              <Input
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddNewAsset} className="text-xs font-bold bg-primary text-primary-foreground">
              Save to Registry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
