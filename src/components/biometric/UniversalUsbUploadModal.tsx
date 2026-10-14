import React, { useState, useMemo } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Calendar,
  Clock,
  UserCheck,
  ShieldCheck,
  Database,
  ArrowRight,
  Download,
  Info,
  Check,
  Building2,
  Sparkles,
} from "lucide-react";
import { safeBiometricFetch, useStore, type Employee, type AttendanceRecord } from "@/lib/store";
import { useAuth } from "@/lib/auth";

interface UniversalUsbUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessSave?: () => void;
}

export function UniversalUsbUploadModal({
  isOpen,
  onClose,
  onSuccessSave,
}: UniversalUsbUploadModalProps) {
  const { employees } = useStore();
  const { activeTenantId } = useAuth();
  const tenantId = activeTenantId || "company-demo";

  // State
  const [step, setStep] = useState<"UPLOAD" | "MAPPING" | "MATRIX_PREVIEW">("UPLOAD");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [targetMonth, setTargetMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Response Data from Server
  const [previewData, setPreviewData] = useState<any>(null);
  const [unmappedList, setUnmappedList] = useState<
    Array<{ biometricCode: string; selectedEmployeeId: string; autoMatched: boolean }>
  >([]);

  // Reset state on open/close
  const handleClose = () => {
    setSelectedFile(null);
    setFileContent("");
    setPreviewData(null);
    setUnmappedList([]);
    setStep("UPLOAD");
    onClose();
  };

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text || "");
    };
    reader.readAsText(file);
  };

  // Generate Sample Biometric USB Log for Quick Demonstration
  const handleGenerateSample = (format: "essl" | "zkteco" | "biomax") => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = String(today.getMonth() + 1).padStart(2, "0");

    let sampleText = "";
    if (format === "essl") {
      sampleText = [
        `101\t${curYear}-${curMonth}-01 09:02:15\t1\t0`,
        `101\t${curYear}-${curMonth}-01 18:35:20\t1\t1`,
        `101\t${curYear}-${curMonth}-02 08:58:10\t1\t0`,
        `101\t${curYear}-${curMonth}-02 18:42:00\t1\t1`,
        `102\t${curYear}-${curMonth}-01 09:15:00\t1\t0`,
        `102\t${curYear}-${curMonth}-01 13:45:00\t1\t1`, // Half-day
        `103\t${curYear}-${curMonth}-01 09:10:00\t1\t0`,
        `103\t${curYear}-${curMonth}-01 18:15:00\t1\t1`,
      ].join("\n");
    } else if (format === "zkteco") {
      sampleText = [
        `101   ${curYear}-${curMonth}-01 09:05:00   1   0   1   0`,
        `101   ${curYear}-${curMonth}-01 18:40:00   1   1   1   0`,
        `102   ${curYear}-${curMonth}-01 09:12:00   1   0   1   0`,
        `102   ${curYear}-${curMonth}-01 18:00:00   1   1   1   0`,
      ].join("\n");
    } else {
      sampleText = [
        `UserID,Date,Time,Status`,
        `101,${curYear}-${curMonth}-01,09:00:00,IN`,
        `101,${curYear}-${curMonth}-01,18:30:00,OUT`,
        `102,${curYear}-${curMonth}-01,09:10:00,IN`,
        `102,${curYear}-${curMonth}-01,18:15:00,OUT`,
      ].join("\n");
    }

    setFileContent(sampleText);
    setSelectedFile(
      new File([sampleText], `sample_${format}_usb_log.txt`, {
        type: "text/plain",
      }),
    );
    toast.success(`Generated standard ${format.toUpperCase()} sample log!`);
  };

  // Phase 1: Send File for Parsing, Deduplication & Preview Aggregation
  const handleParseAndAnalyze = async () => {
    if (!fileContent.trim()) {
      toast.error("Please select or drop a biometric log file first.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await safeBiometricFetch("/api/attendance/usb/parse-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          tenantId,
          fileName: selectedFile?.name || "biometric_usb_log.txt",
          fileContent,
          targetMonth,
        }),
      });

      if (!res || !res.ok) {
        const errJson = await res?.json().catch(() => null);
        throw new Error(errJson?.error || "Failed to parse biometric file");
      }

      const data = await res.json();
      setPreviewData(data);
      if (data.targetYearMonth) {
        setTargetMonth(data.targetYearMonth);
      }

      if (data.status === "MAPPING_REQUIRED") {
        // Intercept: Unmapped biometric codes detected
        const initialMappings = (data.unmappedCodes || []).map((u: any) => ({
          biometricCode: u.biometricCode,
          selectedEmployeeId: u.suggestedEmployee?.id || "",
          autoMatched: !!u.suggestedEmployee?.id,
        }));
        setUnmappedList(initialMappings);
        setStep("MAPPING");
        toast.warning(`Detected ${data.unmappedCodes.length} unmapped biometric employee codes.`);
      } else if (data.status === "READY") {
        setStep("MATRIX_PREVIEW");
        toast.success(
          `Successfully processed ${data.metrics?.cleanPunchesProcessed || 0} punches for ${data.targetYearMonth} across ${data.totalEmployees || 0} employees.`,
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Error processing biometric file");
    } finally {
      setIsProcessing(false);
    }
  };

  // Phase 2: Save Unmapped Codes and Re-trigger Preview
  const handleSaveMappingsAndContinue = async () => {
    const unassigned = unmappedList.find((m) => !m.selectedEmployeeId);
    if (unassigned) {
      toast.error(
        `Please match biometric code "${unassigned.biometricCode}" to a portal employee.`,
      );
      return;
    }

    setIsProcessing(true);
    try {
      const mappingsPayload = unmappedList.map((m) => {
        const emp = (employees || []).find((e) => e.id === m.selectedEmployeeId);
        return {
          biometricCode: m.biometricCode,
          employeeId: m.selectedEmployeeId,
          employeeName: emp ? emp.name : "Employee",
          department: emp?.department || "General",
          empCode: emp?.empCode || m.selectedEmployeeId,
        };
      });

      const saveRes = await safeBiometricFetch("/api/attendance/usb/save-mappings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          tenantId,
          mappings: mappingsPayload,
          adminId: "HR_ADMIN",
        }),
      });

      if (!saveRes || !saveRes.ok) {
        throw new Error("Failed to save biometric mappings");
      }

      toast.success("Biometric mappings linked successfully! Re-calculating matrix...");
      // Re-run parse & preview
      await handleParseAndAnalyze();
    } catch (err: any) {
      toast.error(err.message || "Failed to link biometric mappings");
    } finally {
      setIsProcessing(false);
    }
  };

  // Phase 4: Confirm & Save to Persistent AWS DynamoDB
  const handleConfirmSaveToAws = async () => {
    if (!previewData || !previewData.matrixRows) return;

    setIsSaving(true);
    try {
      // 1. Immediately inject the attendance records into the local Zustand store
      // so Monthly Staff Matrix, Daily Live Roster, and Attendance tables update immediately!
      const recordsToUpsert: AttendanceRecord[] = [];

      for (const row of previewData.matrixRows || []) {
        for (const d of row.days || []) {
          if (d.punchCount > 0 || d.status === "P" || d.status === "HD") {
            const checkInTime = d.checkIn || undefined;
            const checkOutTime = d.checkOut || undefined;
            const hours = d.totalHours || (checkInTime && checkOutTime ? 9 : 4);
            const statusKey: "present" | "half-day" | "absent" =
              d.status === "P" ? "present" : d.status === "HD" ? "half-day" : "absent";

            recordsToUpsert.push({
              id: `att_${row.employeeId}_${d.date}`,
              tenantId,
              employeeId: row.employeeId,
              employeeName: row.employeeName,
              empCode: row.empCode,
              department: row.department,
              date: d.date,
              checkIn: checkInTime,
              clockIn: checkInTime,
              checkOut: checkOutTime,
              clockOut: checkOutTime,
              hoursWorked: hours,
              status: statusKey,
              source: "BIOMETRIC_TERMINAL",
              punchType: "FINGERPRINT",
              regularized: false,
            });
          }
        }
      }

      if (recordsToUpsert.length > 0) {
        useStore.setState((state) => {
          const map = new Map(state.attendance.map((a) => [`${a.employeeId}_${a.date}`, a]));
          for (const r of recordsToUpsert) {
            map.set(`${r.employeeId}_${r.date}`, r);
          }
          return { attendance: Array.from(map.values()) };
        });
      }

      // 2. Commit to AWS Backend & DynamoDB persistence
      const res = await safeBiometricFetch("/api/attendance/usb/confirm-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          tenantId,
          matrixRows: previewData.matrixRows,
          punchSignatures: previewData.newPunchSignatures || [],
          adminId: "HR_ADMIN",
        }),
      });

      if (!res || !res.ok) {
        throw new Error("Failed to commit attendance batch to AWS");
      }

      const resData = await res.json();
      toast.success(
        resData.message || "Monthly attendance records committed to AWS DynamoDB successfully!",
      );
      if (onSuccessSave) onSuccessSave();
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Error saving records to AWS");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper: Month options for dropdown
  const monthOptions = useMemo(() => {
    const list = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const val = d.toISOString().substring(0, 7);
      const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      list.push({ val, label });
    }
    return list;
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl sm:max-w-6xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-border bg-card/60 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  Universal Biometric USB Log Engine
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold border-primary/30 text-primary"
                  >
                    AWS Cloud-Native
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Multi-format log parser with 60s debouncing, dynamic employee code mapping, and
                  monthly attendance matrix review.
                </DialogDescription>
              </div>
            </div>

            {/* Stepper Indicator */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium">
              <span
                className={`px-2.5 py-1 rounded-lg ${
                  step === "UPLOAD"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                1. Upload & Parse
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span
                className={`px-2.5 py-1 rounded-lg ${
                  step === "MAPPING"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2. Employee Mapping
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span
                className={`px-2.5 py-1 rounded-lg ${
                  step === "MATRIX_PREVIEW"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                3. Monthly Matrix Review
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* ========================================================================= */}
          {/* STEP 1: UPLOAD & MULTI-FORMAT AUTO-DETECTION                              */}
          {/* ========================================================================= */}
          {step === "UPLOAD" && (
            <div className="space-y-5">
              {/* Hardware Manufacturer Capabilities Pill */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/40 rounded-xl border border-border text-xs text-muted-foreground">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Auto-Detects Multi-Vendor Hardware:
                </span>
                <Badge variant="secondary" className="text-[11px]">
                  eSSL (Tab)
                </Badge>
                <Badge variant="secondary" className="text-[11px]">
                  ZKTeco (attlog.dat)
                </Badge>
                <Badge variant="secondary" className="text-[11px]">
                  BioMax (CSV)
                </Badge>
                <Badge variant="secondary" className="text-[11px]">
                  Realtime (Semicolon)
                </Badge>
                <Badge variant="secondary" className="text-[11px]">
                  Mantra (Two-Line)
                </Badge>
                <Badge variant="secondary" className="text-[11px]">
                  Matrix COSEC
                </Badge>
              </div>

              {/* Month Selector & Sample Generation Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">Target Payroll Month:</span>
                  <Select value={targetMonth} onValueChange={setTargetMonth}>
                    <SelectTrigger className="h-8 text-xs w-[170px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((m) => (
                        <SelectItem key={m.val} value={m.val} className="text-xs">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sample Test File Shortcuts */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Quick Test Samples:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] px-2.5 rounded-lg"
                    onClick={() => handleGenerateSample("essl")}
                  >
                    eSSL Tab (.txt)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] px-2.5 rounded-lg"
                    onClick={() => handleGenerateSample("zkteco")}
                  >
                    ZKTeco (.dat)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] px-2.5 rounded-lg"
                    onClick={() => handleGenerateSample("biomax")}
                  >
                    BioMax (.csv)
                  </Button>
                </div>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-card/40 relative">
                <input
                  type="file"
                  accept=".txt,.dat,.csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="p-4 rounded-2xl bg-primary/10 text-primary mb-3">
                  <UploadCloud className="h-10 w-10 animate-pulse" />
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  {selectedFile ? selectedFile.name : "Drop USB Biometric log file here"}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  {selectedFile
                    ? `File loaded (${(selectedFile.size / 1024).toFixed(1)} KB). Ready for cloud deduplication & parsing.`
                    : "Supports raw .txt, .dat, and .csv exports downloaded from any biometric USB flash drive."}
                </p>

                {selectedFile && (
                  <div className="mt-4 flex items-center gap-2">
                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Ready to Process
                    </Badge>
                  </div>
                )}
              </div>

              {/* Raw File Preview Peek */}
              {fileContent && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>File Content Preview (First 8 Lines):</span>
                    <span>Total {fileContent.split("\n").length} lines</span>
                  </div>
                  <pre className="p-3 bg-muted/60 rounded-xl font-mono text-[11px] text-foreground overflow-x-auto max-h-36 border border-border">
                    {fileContent.split("\n").slice(0, 8).join("\n")}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: UNMAPPED BIOMETRIC CODES MODAL INTERCEPTION                       */}
          {/* ========================================================================= */}
          {step === "MAPPING" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    Unmapped Biometric Employee Codes Detected
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    The uploaded log file contains {unmappedList.length} biometric punch ID(s) not
                    yet mapped to registered portal employees. Please link them once below. Future
                    uploads will automatically resolve these IDs.
                  </p>
                </div>
              </div>

              {/* Mapping Resolver Table */}
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <div className="grid grid-cols-12 bg-muted/70 p-3 text-xs font-bold text-foreground border-b border-border">
                  <div className="col-span-3">Detected Biometric Code</div>
                  <div className="col-span-6">Link to Registered Portal Employee</div>
                  <div className="col-span-3 text-right">Mapping Status</div>
                </div>

                <div className="divide-y divide-border max-h-72 overflow-y-auto">
                  {unmappedList.map((item, idx) => (
                    <div
                      key={item.biometricCode}
                      className="grid grid-cols-12 p-3 items-center gap-3 text-xs"
                    >
                      <div className="col-span-3 font-mono font-bold text-primary flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono font-bold">
                          PIN: {item.biometricCode}
                        </Badge>
                      </div>

                      <div className="col-span-6">
                        <Select
                          value={item.selectedEmployeeId}
                          onValueChange={(val) => {
                            setUnmappedList((prev) =>
                              prev.map((m, i) =>
                                i === idx
                                  ? { ...m, selectedEmployeeId: val, autoMatched: false }
                                  : m,
                              ),
                            );
                          }}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Search & Select Employee..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-56">
                            {(employees || []).map((emp) => (
                              <SelectItem key={emp.id} value={emp.id} className="text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{emp.name}</span>
                                  <span className="text-muted-foreground text-[11px]">
                                    ({emp.empCode || emp.id})
                                  </span>
                                  <Badge variant="outline" className="text-[10px] py-0 px-1">
                                    {emp.department || "General"}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-3 flex items-center justify-end">
                        {item.autoMatched ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[11px] font-semibold gap-1">
                            <Sparkles className="h-3 w-3" />
                            Auto-Suggested
                          </Badge>
                        ) : item.selectedEmployeeId ? (
                          <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[11px]">
                            Selected
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-destructive border-destructive/30 text-[11px]"
                          >
                            Pending Match
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: MONTHLY ATTENDANCE MATRIX REVIEW (PRE-PERSISTENCE GRID)           */}
          {/* ========================================================================= */}
          {step === "MATRIX_PREVIEW" && previewData && (
            <div className="space-y-4">
              {/* Metrics & Deduplication Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="rounded-xl border-border bg-card/60">
                  <CardContent className="p-3">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Auto-Detected Format
                    </span>
                    <div className="text-sm font-bold text-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {previewData.metrics?.delimiterDetected === "\t"
                          ? "Tab (\\t)"
                          : String(previewData.metrics?.delimiterDetected || "Auto")}
                      </Badge>
                      {previewData.metrics?.dateFormatDetected && (
                        <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                          {previewData.metrics.dateFormatDetected}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {previewData.metrics?.totalLinesParsed} raw lines parsed
                    </span>
                  </CardContent>
                </Card>

                <Card className="rounded-xl border-border bg-card/60">
                  <CardContent className="p-3">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Debounced Jitter Swipes
                    </span>
                    <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      -{previewData.metrics?.debouncedDroppedCount || 0} Punches
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Within 60s sliding window
                    </span>
                  </CardContent>
                </Card>

                <Card className="rounded-xl border-border bg-card/60">
                  <CardContent className="p-3">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Cryptographic Ledger
                    </span>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {previewData.metrics?.cleanPunchesProcessed || 0} Verified
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {previewData.metrics?.existingDuplicateHashesCount || 0} in ledger &bull; {previewData.metrics?.newHashesCount || 0} new
                    </span>
                  </CardContent>
                </Card>

                <Card className="rounded-xl border-emerald-500/20 bg-emerald-500/5">
                  <CardContent className="p-3">
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Valid Punches
                    </span>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {previewData.metrics?.cleanPunchesProcessed || 0} Clean Punches
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {previewData.totalEmployees || 0} mapped employees
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Matrix Grid Table */}
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">
                      Attendance Overview Matrix: {previewData.targetYearMonth}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {previewData.daysInMonth} Days
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Present (P)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" /> Half-Day (HD)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-destructive" /> Absent (A)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-slate-400" /> Off (WO)
                    </span>
                  </div>
                </div>

                {/* Horizontal Scrollable Grid */}
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <TooltipProvider>
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-muted/80 text-[11px] font-semibold text-muted-foreground sticky top-0 z-10 border-b border-border">
                        <tr>
                          <th className="p-2.5 min-w-[160px] sticky left-0 bg-muted/95 z-20">
                            Employee
                          </th>
                          {Array.from(
                            { length: previewData.daysInMonth || 31 },
                            (_, i) => i + 1,
                          ).map((d) => (
                            <th key={d} className="p-1.5 text-center min-w-[32px]">
                              {d}
                            </th>
                          ))}
                          <th className="p-2 text-center min-w-[50px]">P</th>
                          <th className="p-2 text-center min-w-[50px]">HD</th>
                          <th className="p-2 text-center min-w-[50px]">A</th>
                          <th className="p-2 text-center min-w-[65px]">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(previewData.matrixRows || []).map((row: any) => (
                          <tr key={row.employeeId} className="hover:bg-muted/30 transition-colors">
                            <td className="p-2.5 font-medium sticky left-0 bg-card z-10 border-r border-border">
                              <div className="font-bold text-foreground truncate max-w-[150px]">
                                {row.employeeName}
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <span>{row.empCode}</span>
                                <span>•</span>
                                <span className="font-mono text-primary">
                                  PIN: {row.biometricCode}
                                </span>
                              </div>
                            </td>

                            {/* Daily Attendance Badges with Hover Tooltip */}
                            {row.days.map((day: any) => (
                              <td key={day.day} className="p-1 text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className={`inline-flex items-center justify-center h-6 w-6 rounded-md text-[10px] font-bold cursor-pointer transition-transform hover:scale-110 ${
                                        day.status === "P"
                                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                          : day.status === "HD"
                                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                            : day.status === "WO"
                                              ? "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                                              : "bg-destructive/10 text-destructive border border-destructive/20"
                                      }`}
                                    >
                                      {day.status}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs p-2.5">
                                    <div className="font-bold mb-1">{day.date}</div>
                                    <div className="space-y-0.5 text-[11px]">
                                      <div>
                                        In:{" "}
                                        <strong className="text-emerald-600">
                                          {day.checkIn || "—"}
                                        </strong>
                                      </div>
                                      <div>
                                        Out:{" "}
                                        <strong className="text-blue-600">
                                          {day.checkOut || "—"}
                                        </strong>
                                      </div>
                                      <div>
                                        Duration: <strong>{day.totalHours} hrs</strong>
                                      </div>
                                      <div>
                                        Punches Registered: <strong>{day.punchCount}</strong>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                            ))}

                            <td className="p-2 text-center font-bold text-emerald-600">
                              {row.summary?.present || 0}
                            </td>
                            <td className="p-2 text-center font-bold text-amber-600">
                              {row.summary?.halfDay || 0}
                            </td>
                            <td className="p-2 text-center font-bold text-destructive">
                              {row.summary?.absent || 0}
                            </td>
                            <td className="p-2 text-center font-bold text-primary">
                              {row.summary?.totalHours || 0}h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <DialogFooter className="p-4 border-t border-border bg-card/60 flex-shrink-0 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isProcessing || isSaving}
          >
            <X className="h-4 w-4 mr-1.5" />
            Cancel & Discard
          </Button>

          <div className="flex items-center gap-2">
            {step === "UPLOAD" && (
              <Button
                size="sm"
                onClick={handleParseAndAnalyze}
                disabled={!fileContent || isProcessing}
                className="bg-primary text-primary-foreground font-semibold gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Parsing & Deduplicating...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Parse & Review Attendance
                  </>
                )}
              </Button>
            )}

            {step === "MAPPING" && (
              <Button
                size="sm"
                onClick={handleSaveMappingsAndContinue}
                disabled={isProcessing}
                className="bg-primary text-primary-foreground font-semibold gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Linking & Recalculating...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Save Mappings & View Matrix
                  </>
                )}
              </Button>
            )}

            {step === "MATRIX_PREVIEW" && (
              <Button
                size="sm"
                onClick={handleConfirmSaveToAws}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-md shadow-emerald-500/20"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Committing to AWS DynamoDB...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Confirm & Save to AWS Storage
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
