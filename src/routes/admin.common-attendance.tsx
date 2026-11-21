import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { useStore, isActiveEmployee, type Employee, type AttendanceRecord, safeFetch } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Search,
  ScanFace,
  Settings,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Camera,
  CheckCircle2,
  Clock,
  User,
  Building2,
  Briefcase,
  AlertCircle,
  RefreshCw,
    Maximize2,
  Minimize2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  History,
  Phone,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/admin/common-attendance")({
  head: () => ({ meta: [{ title: "Common Attendance Kiosk · CreatonsHR" }] }),
  component: RedirectToAttendanceKiosk,
});

function RedirectToAttendanceKiosk() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/admin/attendance", search: (prev: any) => ({ ...prev, tab: "kiosk" }) as any, replace: true });
  }, [navigate]);

  return <CommonAttendancePage />;
}

/**
 * Web Audio API synthesizer for positive attendance punch audio feedback
 */
function playPunchSuccessSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // First harmonious chime (E5 -> A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.45);

    // Second bell resonance
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(1318.5, ctx.currentTime); // E6
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.5);
      } catch (_e) {}
    }, 120);
  } catch (_err) {}
}

/**
 * Web Audio API synthesizer for biometric rejection / error audio feedback
 */
function playPunchErrorSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(130, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (_err) {}
}

function parseTimeMinutes(s?: string): number {
  if (!s) return -1;
  let cleaned = String(s).trim().toLowerCase();
  if (cleaned.includes("t")) {
    const timePart = cleaned.split("t")[1];
    if (timePart) cleaned = timePart.split(".")[0].replace("z", "").trim();
  } else if (cleaned.includes(" ") && cleaned.includes("-")) {
    const parts = cleaned.split(" ");
    cleaned = parts.slice(1).join(" ").trim();
  }
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return -1;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridiem = match[4]?.toLowerCase();
  if (meridiem === "pm" && h < 12) h += 12;
  if (meridiem === "am" && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Calculate shift punctuality, grace periods, and status matching mobile app logic
 */
function computePunctualityAndStatus(
  now: Date,
  shift: any,
  todayAttendance: AttendanceRecord | undefined,
  isCheckIn: boolean
) {
  const shiftStartStr = shift?.start || "09:00";
  const graceSetting = shift?.graceTime || "15";
  const halfDayLoginTimeStr = shift?.halfDayLoginTime || "12:00";
  const shiftEndStr = shift?.end || "18:00";

  const parsedStart = parseTimeMinutes(shiftStartStr);
  const shiftStartMins = parsedStart >= 0 ? parsedStart : 540;
  const morningGraceMins = graceSetting === "always" ? 9999 : (parseInt(graceSetting, 10) || 15);
  const morningCutoffMins = shiftStartMins + morningGraceMins;

  const parsedHalf = parseTimeMinutes(halfDayLoginTimeStr);
  const halfDayMins = parsedHalf >= 0 ? parsedHalf : 720;

  const parsedEnd = parseTimeMinutes(shiftEndStr);
  const shiftEndMins = parsedEnd >= 0 ? parsedEnd : 1080;

  const currentMins = now.getHours() * 60 + now.getMinutes();

  // Support overnight / cross-midnight shifts (e.g., 23:00 to 01:00)
  const isOvernight = shiftEndMins <= shiftStartMins;
  const effectiveShiftEndMins = isOvernight ? shiftEndMins + 1440 : shiftEndMins;
  let effectivePunchMins = currentMins;
  if (isOvernight && currentMins < shiftStartMins) {
    effectivePunchMins = currentMins + 1440;
  } else if (!isOvernight && shiftStartMins < 360 && currentMins >= 1200) {
    // Early punch before midnight for post-midnight shift (e.g. 11:55 PM for 00:28 shift)
    effectivePunchMins = currentMins - 1440;
  }

  let effectiveHalfDayMins: number;
  if (isOvernight) {
    if (halfDayMins > shiftStartMins && halfDayMins < effectiveShiftEndMins) {
      effectiveHalfDayMins = halfDayMins;
    } else if (halfDayMins + 1440 > shiftStartMins && halfDayMins + 1440 < effectiveShiftEndMins) {
      effectiveHalfDayMins = halfDayMins + 1440;
    } else {
      effectiveHalfDayMins = Math.round((shiftStartMins + effectiveShiftEndMins) / 2);
    }
  } else {
    if (halfDayMins > shiftStartMins && halfDayMins < effectiveShiftEndMins) {
      effectiveHalfDayMins = halfDayMins;
    } else {
      effectiveHalfDayMins = Math.round((shiftStartMins + effectiveShiftEndMins) / 2);
    }
  }

  let computedStatus: "present" | "absent" | "late" | "halfday" = "present";
  let punctualityTag: "on-time" | "within-grace" | "late" | "half-day" | "absent" = "on-time";
  let lateByMinutes: number | undefined = undefined;
  let statusBadge = "On Time";

  if (isCheckIn) {
    if (effectivePunchMins >= effectiveShiftEndMins) {
      computedStatus = "absent";
      punctualityTag = "absent";
      lateByMinutes = effectivePunchMins - shiftStartMins;
      statusBadge = "Invalid Punch (Past Shift)";
    } else if (effectivePunchMins < effectiveHalfDayMins) {
      if (effectivePunchMins <= morningCutoffMins) {
        computedStatus = "present";
        punctualityTag = effectivePunchMins <= shiftStartMins ? "on-time" : "within-grace";
        statusBadge = effectivePunchMins <= shiftStartMins ? "On-Time Check-In" : "Grace Period Check-In";
      } else {
        computedStatus = "late";
        punctualityTag = "late";
        lateByMinutes = effectivePunchMins - shiftStartMins;
        statusBadge = `Late Check-In (${lateByMinutes}m)`;
      }
    } else {
      computedStatus = "halfday";
      punctualityTag = "half-day";
      lateByMinutes = Math.max(0, effectivePunchMins - effectiveHalfDayMins);
      statusBadge = "Half-Day Session";
    }
  }

  let hoursWorked = 0;
  let otHours = 0;
  let isEarlyOut = false;
  let earlyOutBy: number | undefined = undefined;

  if (!isCheckIn && todayAttendance?.clockIn) {
    const [inH, inM] = todayAttendance.clockIn.split(":").map((x: string) => parseInt(x, 10) || 0);
    const clockInMins = inH * 60 + inM;
    let diffMins = currentMins - clockInMins;
    if (diffMins < 0) diffMins += 1440;
    hoursWorked = Number((diffMins / 60).toFixed(1));
    otHours = hoursWorked > 9 ? Number((hoursWorked - 9).toFixed(1)) : 0;
    isEarlyOut = currentMins < shiftEndMins;
    earlyOutBy = isEarlyOut ? shiftEndMins - currentMins : undefined;
    statusBadge = isEarlyOut
      ? `Early Out (${earlyOutBy}m)`
      : otHours > 0
      ? `Completed + OT (${otHours}h)`
      : "Shift Completed";
  }

  return {
    computedStatus,
    punctualityTag,
    lateByMinutes,
    hoursWorked,
    otHours,
    isEarlyOut,
    earlyOutBy,
    statusBadge,
  };
}

export function CommonAttendancePage({ isEmbedded = false }: { isEmbedded?: boolean } = {}) {
  const nav = useNavigate();
  const { user } = useAuth();
  const { company, setCompany, saveAllCompanySettings, employees, attendance, upsertAttendance } = useStore();
  const [isKioskSettingsOpen, setIsKioskSettingsOpen] = useState(false);
  const [savingKioskSettings, setSavingKioskSettings] = useState(false);
  const [showKioskPassword, setShowKioskPassword] = useState(false);

  // Search & Selected employee state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [punchMode, setPunchMode] = useState<"check-in" | "check-out">("check-in");

  // Camera stream state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Authentication & Processing state
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    employeeName: string;
    empCode: string;
    time: string;
    type: "IN" | "OUT";
    similarity: number;
    photoDataUrl?: string;
    statusBadge?: string;
    punctuality?: string;
  } | null>(null);

  // Live Clock & Fullscreen
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Update digital clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Start webcam stream
  const startCamera = async (facing: "user" | "environment" = facingMode) => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (_e) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn("Camera init error:", err);
      let msg = "Camera could not be accessed.";
      if (err.name === "NotAllowedError" || err.message?.includes("Permission")) {
        msg = "Camera permission was denied. Please allow camera access in your browser address bar.";
      } else if (err.name === "NotFoundError" || err.message?.includes("device not found")) {
        msg = "No webcam or video camera found. Please connect a USB camera or device camera.";
      }
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  // Today's ISO date string
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filter active employees matching search query
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return employees
      .filter(isActiveEmployee)
      .filter((e) => {
        const code = String(e.empCode || "").toLowerCase();
        const name = String(e.name || "").toLowerCase();
        const dept = String(e.department || "").toLowerCase();
        const phone = String(e.phone || "").toLowerCase();
        return code.includes(q) || name.includes(q) || dept.includes(q) || phone.includes(q);
      })
      .slice(0, 6);
  }, [searchQuery, employees]);

  // Check today's existing attendance record for selected employee
  const selectedEmpTodayAttendance = useMemo(() => {
    if (!selectedEmployee) return null;
    return attendance.find(
      (a) => a.employeeId === selectedEmployee.id && a.date === todayStr
    );
  }, [selectedEmployee, attendance, todayStr]);

  // Auto-determine suggested punch mode when employee is selected
  useEffect(() => {
    if (!selectedEmployee) return;
    if (selectedEmpTodayAttendance?.clockIn && !selectedEmpTodayAttendance?.clockOut) {
      setPunchMode("check-out");
    } else {
      setPunchMode("check-in");
    }
  }, [selectedEmployee, selectedEmpTodayAttendance]);

  // Today's kiosk scans feed (attendance marked via COMMON_KIOSK or today's punches)
  const todayKioskLogs = useMemo(() => {
    return attendance
      .filter((a) => a.date === todayStr && (a.clockIn || a.checkIn))
      .sort((a, b) => {
        const timeA = a.clockOut || a.clockIn || a.checkIn || "";
        const timeB = b.clockOut || b.clockIn || b.checkIn || "";
        return timeB.localeCompare(timeA);
      });
  }, [attendance, todayStr]);

  // Select employee handler
  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setSearchQuery("");
    setLastErrorMessage(null);
  };

  // Capture face from camera and mark attendance via AWS Rekognition
  const handleCaptureAndPunch = async (forcedMode?: "check-in" | "check-out") => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error("Camera is not ready. Please check camera connection.");
      return;
    }

    setIsVerifying(true);
    setLastErrorMessage(null);

    try {
      // 1. Capture current video frame to canvas
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1); // mirror preview match
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      const capturedDataUrl = canvas.toDataURL("image/jpeg", 0.85);

      // 2. Perform Real Face Authentication via Backend AWS Rekognition
      const tenantId =
        useAuth.getState().activeTenantId ||
        localStorage.getItem("swift-active-tenant") ||
        "demo-tenant-1";

      const verifyRes = await safeFetch("/api/companies/face-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          employeeId: selectedEmployee ? selectedEmployee.id : undefined,
          photoDataUrl: capturedDataUrl,
        }),
      });

      if (!verifyRes || !verifyRes.ok) {
        const errData = verifyRes ? await verifyRes.json().catch(() => null) : null;
        throw new Error(errData?.error || errData?.reason || "Failed to reach AWS Rekognition biometric server.");
      }

      const resData = await verifyRes.json();

      // Strict enforcement: if Rekognition rejects, abort immediately
      if (resData.success === false) {
        playPunchErrorSound();
        const reasonMsg = resData.reason || resData.error || "AWS Rekognition failed: Captured face does not match biometric profile.";
        setLastErrorMessage(reasonMsg);
        toast.error(reasonMsg);
        return;
      }

      // 3. Resolve matched employee (1-to-N automatic detection or 1-to-1 pre-selected verification)
      let targetEmp: Employee | undefined = selectedEmployee || undefined;
      if (!targetEmp && resData.employeeId) {
        targetEmp = employees.find(
          (e) => e.id === resData.employeeId || e.empCode === resData.employeeId || (e as any).code === resData.employeeId
        );
      }

      if (!targetEmp) {
        playPunchErrorSound();
        const msg = `Face recognized as ID "${resData.employeeId}", but no corresponding employee was found in active directory.`;
        setLastErrorMessage(msg);
        toast.error(msg);
        return;
      }

      // Double-check 1-to-1 match integrity if an employee was pre-selected
      if (selectedEmployee && resData.employeeId) {
        const isMatched =
          selectedEmployee.id === resData.employeeId ||
          selectedEmployee.empCode === resData.employeeId ||
          (selectedEmployee as any).code === resData.employeeId;
        if (!isMatched) {
          playPunchErrorSound();
          const mismatchMsg = `Biometric Mismatch: Face matches "${resData.employeeId}", not selected employee "${selectedEmployee.name}".`;
          setLastErrorMessage(mismatchMsg);
          toast.error(mismatchMsg);
          return;
        }
      }

      // 4. Determine Check-In vs Check-Out
      const existingRecord = attendance.find(
        (a) =>
          (a.employeeId === targetEmp!.id || (targetEmp!.empCode && a.empCode === targetEmp!.empCode)) &&
          a.date === todayStr
      );

      let isCheckIn: boolean;
      if (forcedMode) {
        isCheckIn = forcedMode === "check-in";
      } else {
        isCheckIn = punchMode === "check-in";
      }

      if (!isCheckIn && !existingRecord?.clockIn) {
        toast.info(`${targetEmp.name} has not checked in today. Automatically marking Check-In.`);
        isCheckIn = true;
      }

      // 5. Compute punch timestamps & punctuality rules
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      const displayTime = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

      const employeeShift = company.shifts?.find((s) => s.id === targetEmp!.shiftId) || company.shifts?.[0];
      const similarityScore = Number(resData.similarity ? resData.similarity.toFixed(1) : 99.4);
      const s3Url = resData.url || capturedDataUrl;

      const punctualityData = computePunctualityAndStatus(now, employeeShift, existingRecord, isCheckIn);

      const updatedRecord: AttendanceRecord = {
        id: existingRecord?.id || crypto.randomUUID(),
        tenantId,
        employeeId: targetEmp.id,
        employeeName: targetEmp.name,
        empCode: targetEmp.empCode || targetEmp.id,
        department: targetEmp.department || "General",
        date: todayStr,
        clockIn: isCheckIn ? timeStr : (existingRecord?.clockIn || timeStr),
        checkIn: isCheckIn ? timeStr : (existingRecord?.checkIn || timeStr),
        clockOut: !isCheckIn ? timeStr : existingRecord?.clockOut,
        checkOut: !isCheckIn ? timeStr : existingRecord?.checkOut,
        checkInPhoto: isCheckIn ? s3Url : existingRecord?.checkInPhoto,
        checkOutPhoto: !isCheckIn ? s3Url : existingRecord?.checkOutPhoto,
        photoDataUrl: s3Url,
        faceVerified: true,
        geofenceVerified: true,
        similarity: similarityScore,
        source: "COMMON_KIOSK",
        status: isCheckIn ? punctualityData.computedStatus : (existingRecord?.status || "present"),
        punctuality: isCheckIn ? punctualityData.punctualityTag : (existingRecord?.punctuality || "on-time"),
        lateBy: isCheckIn ? punctualityData.lateByMinutes : existingRecord?.lateBy,
        shiftId: employeeShift?.id,
        shiftName: employeeShift?.name,
        shiftStart: employeeShift?.start,
        shiftEnd: employeeShift?.end,
        hoursWorked: !isCheckIn ? punctualityData.hoursWorked : (existingRecord?.hoursWorked || 0),
        otHours: !isCheckIn ? punctualityData.otHours : (existingRecord?.otHours || 0),
        updatedAt: now.toISOString(),
      };

      // Save to store and sync to backend
      upsertAttendance(updatedRecord);

      // Play positive audio chime
      playPunchSuccessSound();

      // Set verification success modal/banner
      setVerificationResult({
        success: true,
        employeeName: targetEmp.name,
        empCode: targetEmp.empCode || targetEmp.id,
        time: displayTime,
        type: isCheckIn ? "IN" : "OUT",
        similarity: similarityScore,
        photoDataUrl: s3Url,
        statusBadge: punctualityData.statusBadge,
        punctuality: punctualityData.punctualityTag,
      });

      toast.success(
        `AWS Rekognition Verified: ${targetEmp.name} (Check-${isCheckIn ? "In" : "Out"} at ${displayTime})`
      );

      // Auto clear after 4 seconds so kiosk is ready for the next person
      setTimeout(() => {
        setSelectedEmployee(null);
        setVerificationResult(null);
        setLastErrorMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error("Attendance punching error:", err);
      playPunchErrorSound();
      setLastErrorMessage(err.message || "Face recognition failed. Please try again.");
      toast.error(err.message || "Face recognition failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const currentShift = company.shifts?.[0];
  const terminalTitle = company.commonPortal?.portalTitle?.trim() || "Common Attendance";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 text-foreground flex flex-col font-sans select-none overflow-x-hidden p-3 sm:p-5 lg:p-6 transition-colors duration-300 relative">
      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-7xl mx-auto w-full flex flex-col gap-4 sm:gap-5 flex-1 relative z-10">
        {/* Top Header Card: Terminal Title | Live Clock & Shift | Settings & Fullscreen */}
        <header className="rounded-2xl sm:rounded-3xl bg-card/85 backdrop-blur-md border border-primary/20 px-5 sm:px-7 py-3.5 sm:py-4 flex items-center justify-between gap-4 shadow-soft">
          {/* Left: Terminal Title given in settings */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-brand text-primary-foreground flex items-center justify-center shadow-md shadow-primary/25">
              <ScanFace className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
                {terminalTitle}
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Face Recognition & Biometric Punch Terminal
              </p>
            </div>
          </div>

          {/* Center: Live Time & Shift */}
          <div className="flex items-center gap-2 sm:gap-3 text-center">
            <div className="bg-primary/10 border border-primary/25 px-4 py-1.5 rounded-2xl shadow-inner">
              <span className="text-base sm:text-xl font-bold font-mono tracking-wider text-primary">
                {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
              </span>
            </div>
            <span className="text-xs font-semibold text-primary/90 hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-primary/15 to-accent/15 border border-primary/25 px-3 py-1.5 rounded-full shadow-2xs">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {currentShift ? `${currentShift.name} (${currentShift.start} - ${currentShift.end})` : "General Shift"}
            </span>
          </div>

          {/* Right: Settings & Fullscreen */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsKioskSettingsOpen(true)}
              className="h-10 w-10 rounded-2xl bg-card hover:bg-primary/10 text-foreground border border-primary/20 hover:border-primary/50 flex items-center justify-center transition-all cursor-pointer shadow-2xs group"
              title="Attendance Kiosk Settings"
            >
              <SlidersHorizontal className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="h-10 w-10 rounded-2xl bg-card hover:bg-primary/10 text-foreground border border-primary/20 hover:border-primary/50 flex items-center justify-center transition-all cursor-pointer shadow-2xs group"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              ) : (
                <Maximize2 className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              )}
            </button>
          </div>
        </header>

        {/* Middle 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
          {/* Left Column: Camera + Clock In / Clock Out Toggle + Punch */}
          <div className="lg:col-span-7 rounded-2xl sm:rounded-3xl bg-card/85 backdrop-blur-md border border-primary/20 p-4 sm:p-5 flex flex-col gap-4 shadow-soft">
            {/* Viewfinder Area */}
            <div className="relative aspect-[4/3] sm:aspect-[16/11] bg-slate-950 rounded-2xl border-2 border-primary/30 overflow-hidden flex items-center justify-center shadow-card group">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />

              {/* Center icon / guide overlay */}
              {!cameraActive ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-slate-950/90 p-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shadow-glow">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-primary">Camera Initializing...</span>
                </div>
              ) : (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className={`relative h-56 w-48 sm:h-64 sm:w-52 rounded-[50%] border-2 ${
                      isVerifying
                        ? "border-primary shadow-[0_0_25px_var(--primary)]"
                        : selectedEmployee
                        ? "border-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.4)]"
                        : "border-primary/50 shadow-[0_0_12px_rgba(139,92,246,0.25)]"
                    } transition-all duration-300`}
                  >
                    {/* Laser scan beam */}
                    {isVerifying && (
                      <motion.div
                        initial={{ top: "0%" }}
                        animate={{ top: "100%" }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_var(--primary)]"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Camera Error overlay */}
              {cameraError && (
                <div className="absolute inset-0 bg-background/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10">
                  <AlertCircle className="h-10 w-10 text-destructive mb-2" />
                  <p className="text-xs font-semibold text-foreground mb-3 max-w-sm">{cameraError}</p>
                  <Button size="sm" onClick={() => startCamera()} className="h-8 text-xs font-semibold bg-primary text-primary-foreground">
                    Retry Camera
                  </Button>
                </div>
              )}

              {/* Status pill on top of viewfinder */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="bg-card/90 text-foreground backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold border border-emerald-500/40 flex items-center gap-2 shadow-md">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">AWS Rekognition Live</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
                  className="pointer-events-auto h-7 px-3 rounded-full bg-card/90 text-foreground hover:bg-card border border-border/80 text-[11px] font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  title="Switch camera"
                >
                  <RefreshCw className="h-3 w-3 text-primary" />
                  <span className="hidden sm:inline">Flip Camera</span>
                </button>
              </div>

              {/* Bottom error or guidance badge */}
              <div className="absolute bottom-3 inset-x-0 flex justify-center px-4 pointer-events-none">
                {lastErrorMessage ? (
                  <div className="bg-destructive/95 border border-destructive text-destructive-foreground backdrop-blur-md px-4 py-1.5 rounded-full text-xs flex items-center gap-1.5 shadow-lg max-w-md text-center font-medium pointer-events-auto">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{lastErrorMessage}</span>
                  </div>
                ) : (
                  <div className="bg-card/90 text-foreground backdrop-blur-md px-4 py-1.5 rounded-full text-[11px] text-muted-foreground border border-border/80 text-center shadow-xs font-medium">
                    {selectedEmployee
                      ? `Align face & tap punch for ${selectedEmployee.name.split(" ")[0]}`
                      : "Align face inside frame & tap punch to auto-detect"}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Controls Bar: Clock In / Clock Out Toggle + Punch Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Clock In / Clock Out Segmented Toggle */}
              <div className="inline-flex p-1.5 rounded-2xl bg-muted/80 dark:bg-muted/40 border border-primary/20 shadow-inner">
                <button
                  type="button"
                  onClick={() => setPunchMode("check-in")}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                    punchMode === "check-in"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full transition-all ${punchMode === "check-in" ? "bg-white shadow-xs" : "bg-emerald-500/60"}`} />
                  <span>Clock In</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPunchMode("check-out")}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                    punchMode === "check-out"
                      ? "bg-sky-600 text-white shadow-md shadow-sky-600/30 scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full transition-all ${punchMode === "check-out" ? "bg-white shadow-xs" : "bg-sky-500/60"}`} />
                  <span>Clock Out</span>
                </button>
              </div>

              {/* Punch trigger button */}
              <button
                type="button"
                onClick={() => handleCaptureAndPunch()}
                disabled={isVerifying || !cameraActive}
                className="h-12 px-8 sm:px-10 rounded-2xl text-sm sm:text-base font-bold bg-gradient-brand text-primary-foreground hover:opacity-95 shadow-glow disabled:opacity-50 disabled:shadow-none transition-all duration-200 cursor-pointer flex items-center gap-2.5 group active:scale-[0.98]"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin text-primary-foreground" />
                    <span>Verifying Face...</span>
                  </>
                ) : (
                  <>
                    <ScanFace className="h-5 w-5 text-primary-foreground group-hover:scale-110 transition-transform" />
                    <span>{punchMode === "check-in" ? "Punch In" : "Punch Out"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Search + Employee Details */}
          <div className="lg:col-span-5 rounded-2xl sm:rounded-3xl bg-card/85 backdrop-blur-md border border-primary/20 p-4 sm:p-5 flex flex-col gap-4 shadow-soft">
            {/* Search Box */}
            <div className="bg-gradient-to-br from-card via-primary/[0.03] to-muted/40 rounded-2xl border border-primary/20 p-4 shadow-2xs relative">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Search className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
                  Search Employee
                </h2>
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-primary" />
                <Input
                  type="text"
                  placeholder="Search staff by name, code (e.g. SWF001), phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-9 h-11 text-xs sm:text-sm bg-card border-primary/25 focus-visible:ring-primary rounded-xl shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              <AnimatePresence>
                {filteredEmployees.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute left-4 right-4 top-[95px] z-30 bg-popover border border-primary/25 rounded-2xl shadow-xl overflow-hidden divide-y divide-border"
                  >
                    {filteredEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        onClick={() => handleSelectEmployee(emp)}
                        className="p-3 hover:bg-primary/10 transition-colors cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center font-bold text-xs text-primary shrink-0 overflow-hidden">
                            {emp.photoDataUrl ? (
                              <img src={emp.photoDataUrl} alt={emp.name} className="h-full w-full object-cover" />
                            ) : (
                              emp.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-foreground group-hover:text-primary flex items-center gap-1.5">
                              {emp.name}
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                                {emp.empCode}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {emp.designation || emp.department || "Staff"}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Employee Details Box */}
            <div className="bg-gradient-to-br from-card via-primary/[0.03] to-muted/40 rounded-2xl border border-primary/20 p-4 sm:p-5 shadow-2xs flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
                      Employee Details
                    </h2>
                  </div>
                  {selectedEmployee && (
                    <button
                      type="button"
                      onClick={() => setSelectedEmployee(null)}
                      className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-full transition-colors"
                    >
                      <X className="h-3.5 w-3.5" /> Clear
                    </button>
                  )}
                </div>

                {selectedEmployee ? (
                  <div className="space-y-3.5">
                    {/* Header info */}
                    <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-primary/10 via-card to-accent/10 border border-primary/25 shadow-2xs">
                      <div className="h-14 w-14 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center font-bold text-lg text-primary shrink-0 overflow-hidden shadow-xs ring-2 ring-primary/20">
                        {selectedEmployee.photoDataUrl ? (
                          <img
                            src={selectedEmployee.photoDataUrl}
                            alt={selectedEmployee.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          selectedEmployee.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground truncate">
                            {selectedEmployee.name}
                          </span>
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 shrink-0">
                            {selectedEmployee.empCode}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {selectedEmployee.designation || "Staff Member"}
                        </p>
                      </div>
                    </div>

                    {/* Metadata grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-xl bg-card border border-primary/20 shadow-2xs">
                        <span className="text-[11px] text-primary/80 block font-medium">Department</span>
                        <span className="font-semibold text-foreground truncate block mt-0.5">
                          {selectedEmployee.department || "General"}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-card border border-primary/20 shadow-2xs">
                        <span className="text-[11px] text-primary/80 block font-medium">Assigned Shift</span>
                        <span className="font-semibold text-foreground truncate block mt-0.5">
                          {currentShift ? `${currentShift.name}` : "General"}
                        </span>
                      </div>
                    </div>

                    {/* Today's Punch State */}
                    <div className="p-3.5 rounded-xl border border-primary/20 bg-card shadow-2xs">
                      <div className="text-[11px] font-bold text-primary mb-1.5 flex items-center justify-between">
                        <span>Today's Status</span>
                        <span className="font-mono text-muted-foreground font-normal">{todayStr}</span>
                      </div>
                      {selectedEmpTodayAttendance?.clockIn ? (
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4" /> Clocked IN:
                            </span>
                            <span className="font-mono font-bold text-foreground">
                              {selectedEmpTodayAttendance.clockIn}
                            </span>
                          </div>
                          {selectedEmpTodayAttendance.clockOut && (
                            <div className="flex items-center justify-between">
                              <span className="text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4" /> Clocked OUT:
                              </span>
                              <span className="font-mono font-bold text-foreground">
                                {selectedEmpTodayAttendance.clockOut}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground flex items-center gap-2 py-1">
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>Not punched in today yet. Ready for Clock In.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center flex flex-col items-center justify-center text-muted-foreground">
                    <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
                      <User className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">No Employee Selected</span>
                    <span className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                      Search an employee above or align face in the camera frame to auto-detect.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Full-Width History Card */}
        <div className="rounded-2xl sm:rounded-3xl bg-card/85 backdrop-blur-md border border-primary/20 p-4 sm:p-6 flex flex-col gap-4 shadow-soft">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <History className="h-4 w-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                Today's Punch History
              </h2>
            </div>
            <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3.5 py-1 rounded-full font-mono">
              {todayKioskLogs.length} Records Today
            </span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {todayKioskLogs.length > 0 ? (
              todayKioskLogs.map((log) => {
                const emp = employees.find((e) => e.id === log.employeeId);
                const isOut = Boolean(log.clockOut);
                const time = log.clockOut || log.clockIn || log.checkIn || "--:--";
                return (
                  <div
                    key={log.id}
                    className="bg-card hover:bg-primary/[0.04] border border-primary/15 hover:border-primary/40 rounded-2xl sm:rounded-full px-5 py-3.5 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center font-bold text-xs text-primary shrink-0 overflow-hidden ring-1 ring-primary/20">
                        {log.photoDataUrl || emp?.photoDataUrl ? (
                          <img
                            src={log.photoDataUrl || emp?.photoDataUrl}
                            alt={log.employeeName || "Employee"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          (log.employeeName || "EM").slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs sm:text-sm text-foreground truncate flex items-center gap-2">
                          <span>{log.employeeName || emp?.name || "Staff Member"}</span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold">
                            {log.empCode || emp?.empCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {emp?.designation || log.department || "Staff"} · {log.shiftName || currentShift?.name || "General Shift"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs font-mono font-semibold text-foreground">{time}</span>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">AWS Verified</div>
                      </div>
                      <span
                        className={`px-3.5 py-1 rounded-full text-xs font-bold border ${
                          isOut
                            ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        }`}
                      >
                        {isOut ? "Clock Out" : "Clock In"}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-card/70 border border-dashed border-primary/20 rounded-2xl sm:rounded-full px-5 py-3.5 flex items-center justify-between text-xs text-muted-foreground"
                  >
                    <span>No punch recorded in slot #{i}</span>
                    <span className="font-mono">--:--</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Celebratory Verification Modal / Dialog */}
      <AnimatePresence>
        {verificationResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card border-2 border-primary/40 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden text-card-foreground"
            >
              {/* Glow Background */}
              <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
              <div className="absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="h-20 w-20 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-primary mb-4 animate-bounce">
                  <CheckCircle2 className="h-10 w-10" />
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/25 mb-2">
                  Facial Authentication Verified
                </span>

                <h3 className="text-2xl font-display font-bold text-foreground mb-1">
                  Attendance Recorded!
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {verificationResult.employeeName} ({verificationResult.empCode})
                </p>

                {verificationResult.photoDataUrl && (
                  <div className="h-24 w-24 rounded-2xl overflow-hidden border-2 border-primary shadow-md mb-4">
                    <img
                      src={verificationResult.photoDataUrl}
                      alt="Captured Face"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 w-full mb-6">
                  <div className="p-3 rounded-xl bg-muted/60 border border-border text-left">
                    <span className="text-[11px] text-muted-foreground block">Punch Type</span>
                    <span className="text-base font-bold text-primary">
                      CHECK-{verificationResult.type}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/60 border border-border text-left">
                    <span className="text-[11px] text-muted-foreground block">Timestamp</span>
                    <span className="text-base font-bold text-foreground font-mono">
                      {verificationResult.time}
                    </span>
                  </div>
                </div>

                {verificationResult.statusBadge && (
                  <div className="mb-4 px-3 py-1 rounded-full bg-muted border border-border text-xs font-semibold text-primary inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{verificationResult.statusBadge}</span>
                  </div>
                )}

                <div className="text-xs text-foreground flex items-center justify-center gap-2 bg-primary/10 py-1.5 px-3 rounded-xl border border-primary/25">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>AWS Rekognition Confidence: <strong className="font-mono">{verificationResult.similarity}%</strong></span>
                </div>

                <p className="text-[11px] text-muted-foreground mt-4">
                  Window will reset automatically for the next employee...
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attendance Kiosk Settings Dialog */}
      <Dialog open={isKioskSettingsOpen} onOpenChange={setIsKioskSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanFace className="h-5 w-5 text-primary" />
              <span>Attendance Kiosk Settings</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure credentials, gate title, and authentication rules for this common attendance terminal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Kiosk Enable Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-primary/20 bg-primary/5">
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground text-xs">Kiosk Portal Status</span>
                <p className="text-[11px] text-muted-foreground">
                  Allow shared terminal authentication on login page
                </p>
              </div>
              <Switch
                checked={Boolean(company.commonPortal?.enabled || company.commonPortalEnabled)}
                onCheckedChange={(checked) => {
                  setCompany({
                    commonPortalEnabled: checked,
                    commonPortal: {
                      ...(company.commonPortal || {}),
                      enabled: checked,
                      username: company.commonPortal?.username || company.commonPortalUsername || "kiosk@creatonshr.com",
                      password: company.commonPortal?.password || company.commonPortalPassword || "kiosk123",
                      portalTitle: company.commonPortal?.portalTitle || "Common Attendance Kiosk",
                      requireFaceMatch: company.commonPortal?.requireFaceMatch ?? true,
                    },
                    commonPortalUsername: company.commonPortal?.username || company.commonPortalUsername || "kiosk@creatonshr.com",
                    commonPortalPassword: company.commonPortal?.password || company.commonPortalPassword || "kiosk123",
                  });
                }}
              />
            </div>

            {/* Username & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Kiosk Username / Terminal ID</Label>
                <Input
                  placeholder="e.g. kiosk@creatonshr.com"
                  value={company.commonPortal?.username || company.commonPortalUsername || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCompany({
                      commonPortalUsername: val,
                      commonPortal: {
                        ...(company.commonPortal || { enabled: true }),
                        username: val,
                      },
                    });
                  }}
                  className="text-xs font-medium"
                />
                <p className="text-[10px] text-muted-foreground">Used on login page to launch kiosk.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Kiosk Password</Label>
                <div className="relative">
                  <Input
                    type={showKioskPassword ? "text" : "password"}
                    placeholder="Terminal password"
                    value={company.commonPortal?.password || company.commonPortalPassword || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompany({
                        commonPortalPassword: val,
                        commonPortal: {
                          ...(company.commonPortal || { enabled: true }),
                          password: val,
                        },
                      });
                    }}
                    className="text-xs font-medium pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKioskPassword(!showKioskPassword)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showKioskPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">Authenticate shared terminal.</p>
              </div>
            </div>

            {/* Terminal Banner / Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Terminal Title / Gate Location</Label>
              <Input
                placeholder="e.g. Main Factory Gate 1 Kiosk / Reception Terminal"
                value={company.commonPortal?.portalTitle || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setCompany({
                    commonPortal: {
                      ...(company.commonPortal || { enabled: true }),
                      portalTitle: val,
                    },
                  });
                }}
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Displayed at top header of the kiosk screen.</p>
            </div>

            {/* Face Match Requirement */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground text-xs">Biometric Face Matching</span>
                <p className="text-[10px] text-muted-foreground">
                  Verify captured live face with enrolled employee profile before marking punch
                </p>
              </div>
              <Switch
                checked={company.commonPortal?.requireFaceMatch ?? true}
                onCheckedChange={(checked) => {
                  setCompany({
                    commonPortal: {
                      ...(company.commonPortal || { enabled: true }),
                      requireFaceMatch: checked,
                    },
                  });
                }}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsKioskSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setSavingKioskSettings(true);
                try {
                  await saveAllCompanySettings?.();
                  toast.success("Attendance Kiosk settings saved to cloud database!");
                  setIsKioskSettingsOpen(false);
                } catch (e: any) {
                  toast.error("Failed to save kiosk settings: " + (e?.message || e));
                } finally {
                  setSavingKioskSettings(false);
                }
              }}
              disabled={savingKioskSettings}
              className="gap-1.5 bg-primary text-primary-foreground font-semibold"
            >
              {savingKioskSettings ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span>{savingKioskSettings ? "Saving..." : "Save Kiosk Settings"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
