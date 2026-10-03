import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  FileSpreadsheet,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
  Building2,
  Users,
  ShieldCheck,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Company, Employee, AttendanceRecord } from "@/lib/store";
import { inr } from "@/lib/payroll";
import {
  computeEpfoEcrRecords,
  downloadEpfoEcrTxt,
  downloadEpfoEcrXlsx,
  type EpfoEcrRecord,
} from "@/lib/epfo-ecr";

export interface EpfoEcrModalProps {
  open: boolean;
  onClose: () => void;
  company: Company;
  employees: Employee[];
  attendance: AttendanceRecord[];
  roster?: any[];
  requests?: any[];
  monthlyOverrides?: Record<string, any>;
  defaultMonth: string;
}

export function EpfoEcrModal({
  open,
  onClose,
  company,
  employees,
  attendance,
  roster = [],
  requests = [],
  monthlyOverrides = {},
  defaultMonth,
}: EpfoEcrModalProps) {
  const [selectedMonth, setSelectedMonth] = useState(
    defaultMonth || new Date().toISOString().slice(0, 7)
  );
  const [includeAllStaff, setIncludeAllStaff] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [downloadingTxt, setDownloadingTxt] = useState(false);
  const [downloadingXlsx, setDownloadingXlsx] = useState(false);

  useEffect(() => {
    if (defaultMonth) {
      setSelectedMonth(defaultMonth);
    }
  }, [defaultMonth]);

  const ineligibleEmployees = useMemo(() => {
    return employees.filter((e) => e.pfEligible === false);
  }, [employees]);

  // Generate 12 recent months
  const monthOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = d.toISOString().slice(0, 7);
      const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
      list.push({ value: val, label });
    }
    return list;
  }, []);

  const monthLabel = useMemo(() => {
    if (!selectedMonth) return "";
    const [y, m] = selectedMonth.split("-").map(Number);
    if (!y || !m) return selectedMonth;
    return new Date(y, m - 1, 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [selectedMonth]);

  // Compute live ECR records for the selected month
  const records = useMemo<EpfoEcrRecord[]>(() => {
    if (!open) return [];
    try {
      return computeEpfoEcrRecords({
        company,
        employees,
        attendance,
        roster,
        requests,
        monthlyOverrides,
        selectedMonth,
        includeAllStaff,
      });
    } catch (e) {
      console.error("Failed to compute EPFO ECR records:", e);
      return [];
    }
  }, [
    open,
    company,
    employees,
    attendance,
    roster,
    requests,
    monthlyOverrides,
    selectedMonth,
    includeAllStaff,
  ]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalMembers = records.length;
    const totalGross = records.reduce((s, r) => s + r.grossWages, 0);
    const totalEpfWages = records.reduce((s, r) => s + r.epfWages, 0);
    const totalEpsWages = records.reduce((s, r) => s + r.epsWages, 0);
    const totalEeShare = records.reduce((s, r) => s + r.eeShare, 0);
    const totalEpsShare = records.reduce((s, r) => s + r.epsShare, 0);
    const totalErShare = records.reduce((s, r) => s + r.erShare, 0);
    const totalChallan = totalEeShare + totalEpsShare + totalErShare;
    const missingUanCount = records.filter((r) => r.isMissingUan).length;
    const missingUanEmployees = records.filter((r) => r.isMissingUan);

    return {
      totalMembers,
      totalGross,
      totalEpfWages,
      totalEpsWages,
      totalEeShare,
      totalEpsShare,
      totalErShare,
      totalChallan,
      missingUanCount,
      missingUanEmployees,
    };
  }, [records]);

  // Handle TXT download (#~# delimited)
  const handleDownloadTxt = () => {
    try {
      setDownloadingTxt(true);
      downloadEpfoEcrTxt(
        {
          company,
          employees,
          attendance,
          roster,
          requests,
          monthlyOverrides,
          selectedMonth,
          includeAllStaff,
        },
        records
      );
      toast.success(
        `EPFO ECR text file (#~# delimited) for ${monthLabel} downloaded successfully!`
      );
    } catch (err) {
      console.error("Error generating EPFO ECR TXT:", err);
      toast.error("Failed to generate EPFO ECR .txt file.");
    } finally {
      setDownloadingTxt(false);
    }
  };

  // Handle XLSX download (Excel with headings & summary totals)
  const handleDownloadXlsx = () => {
    try {
      setDownloadingXlsx(true);
      downloadEpfoEcrXlsx(
        {
          company,
          employees,
          attendance,
          roster,
          requests,
          monthlyOverrides,
          selectedMonth,
          includeAllStaff,
        },
        records
      );
      toast.success(
        `EPFO ECR spreadsheet (.xlsx) for ${monthLabel} downloaded successfully!`
      );
    } catch (err) {
      console.error("Error generating EPFO ECR Excel:", err);
      toast.error("Failed to generate EPFO ECR .xlsx file.");
    } finally {
      setDownloadingXlsx(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl border border-border shadow-2xl">
        {/* Header */}
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span>EPFO ECR (Electronic Challan cum Return)</span>
              </DialogTitle>

              {/* Clickable (i) info icon */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setInfoOpen(true);
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors border border-blue-500/30 cursor-pointer shadow-xs shrink-0"
                aria-label="View ECR 2.0 Specification & Structure"
                title="Click to view ECR 2.0 Specification & Structure"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </div>

            <Badge
              variant="outline"
              className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 text-xs font-semibold"
            >
              {stats.totalMembers} Enrolled Members
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
            Generate and export the monthly EPFO Electronic Challan cum Return (ECR) in official{" "}
            <strong className="text-foreground font-semibold">#~# delimited plain text (.txt)</strong>{" "}
            format for direct EPFO Employer Portal upload, or download as an audit-ready{" "}
            <strong className="text-foreground font-semibold">Excel (.xlsx)</strong> workbook.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Month Selection */}
          <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-600" /> Select Processing Month
              </Label>
              <Badge variant="secondary" className="text-xs font-semibold text-blue-700 dark:text-blue-300 font-mono">
                {monthLabel}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Select from recent months</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="text-xs bg-card h-9">
                    <SelectValue placeholder="Choose month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium">
                        {opt.label} ({opt.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Custom Month (YYYY-MM)</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                  className="text-xs bg-card h-9 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Member Inclusion Toggle */}
          {ineligibleEmployees.length > 0 && (
            <div className="p-3.5 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <span>Include All Company Staff</span>
                  <Badge variant={includeAllStaff ? "default" : "secondary"} className="text-[10px] px-2 py-0.5">
                    {includeAllStaff ? `All ${records.length} Staff Loaded` : `${records.length} PF-Eligible Only`}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {ineligibleEmployees.length} employee(s) ({ineligibleEmployees.map((e) => e.name).join(", ")}) have <em>'PF Eligible'</em> unchecked in their Employee Profile. {includeAllStaff ? "They are included in this return." : "They are excluded from this return."}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Label htmlFor="include-all-staff" className="text-xs text-muted-foreground font-medium cursor-pointer">
                  {includeAllStaff ? "All Members" : "PF Only"}
                </Label>
                <Switch
                  id="include-all-staff"
                  checked={includeAllStaff}
                  onCheckedChange={setIncludeAllStaff}
                />
              </div>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl border border-border bg-card">
              <span className="text-[10.5px] text-muted-foreground block">Gross Wages</span>
              <span className="text-sm font-bold text-foreground block mt-0.5">
                {inr(stats.totalGross)}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-border bg-card">
              <span className="text-[10.5px] text-muted-foreground block">EPF Wages</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400 block mt-0.5">
                {inr(stats.totalEpfWages)}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-border bg-card">
              <span className="text-[10.5px] text-muted-foreground block">Employee PF (12%)</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                {inr(stats.totalEeShare)}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-border bg-card">
              <span className="text-[10.5px] text-muted-foreground block">Total Challan (EE+ER)</span>
              <span className="text-sm font-bold text-primary block mt-0.5">
                {inr(stats.totalChallan)}
              </span>
            </div>
          </div>

          {/* Missing UAN Warning Banner if any */}
          {stats.missingUanCount > 0 && (
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-200">
                <p className="font-semibold">
                  {stats.missingUanCount} employee(s) have missing or incomplete 12-digit UAN:
                </p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                  {stats.missingUanEmployees.slice(0, 3).map((e) => e.memberName).join(", ")}
                  {stats.missingUanCount > 3 ? ` and ${stats.missingUanCount - 3} more` : ""}.
                  EPFO Portal will require valid 12-digit UANs upon upload.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer with 2 Download Buttons */}
        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-border mt-1">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl text-xs h-9"
          >
            Close
          </Button>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {/* Button 1: Download XLSX */}
            <Button
              onClick={handleDownloadXlsx}
              disabled={downloadingXlsx || records.length === 0}
              variant="outline"
              className="w-full sm:w-auto rounded-xl text-xs h-9 font-bold border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1.5"
            >
              {downloadingXlsx ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 animate-spin" /> Generating Excel...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Download ECR (.xlsx)
                </>
              )}
            </Button>

            {/* Button 2: Download TXT */}
            <Button
              onClick={handleDownloadTxt}
              disabled={downloadingTxt || records.length === 0}
              className="w-full sm:w-auto rounded-xl text-xs h-9 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 gap-1.5"
            >
              {downloadingTxt ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 animate-spin" /> Generating Text File...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" /> Download ECR (.txt)
                </>
              )}
            </Button>
          </div>
        </DialogFooter>

        {/* Centered ECR 2.0 Specification & Structure Popup (Direct in-modal overlay with event isolation) */}
        {infoOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setInfoOpen(false);
            }}
          >
            <div
              className="relative w-full max-w-md p-6 rounded-3xl border border-border shadow-2xl bg-card text-foreground space-y-3.5 animate-in zoom-in-95"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
                    <Info className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">ECR 2.0 Specification</h3>
                    <p className="text-[11px] text-muted-foreground">Official EPFO File Structure</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    11 Fields
                  </Badge>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setInfoOpen(false);
                    }}
                    className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                Official EPFO Unified Portal format (ECR 2.0). The downloaded plain text file contains all 11 fields delimited by <code className="font-mono text-foreground font-bold bg-muted px-1.5 py-0.5 rounded text-[10.5px]">#~#</code> with no header line, ready for portal upload.
              </p>

              {/* Breakdown Grid */}
              <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
                <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                  Included Fields Breakdown:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">1.</span> UAN (12 Digits)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">2.</span> Member Name (KYC)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">3.</span> Gross Wages
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">4.</span> EPF Wages (Max ₹15k)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">5.</span> EPS Wages (₹0 if age ≥ 58)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">6.</span> EDLI Wages (Max ₹15k)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">7.</span> EE Share (12% Contrib)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">8.</span> EPS Share (8.33% / ₹1250)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">9.</span> ER Share (EPF: 3.67%)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">10.</span> NCP Days (Unpaid absent)
                  </div>
                  <div className="flex items-center gap-1.5 sm:col-span-2">
                    <span className="font-bold text-foreground">11.</span> Refund of Advance (Standard 0)
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end pt-2 border-t border-border">
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setInfoOpen(false);
                  }}
                  className="rounded-xl text-xs h-8 px-4 font-semibold bg-primary text-primary-foreground"
                >
                  Got it
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
