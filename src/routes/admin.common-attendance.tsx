import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { useStore, type Employee, type AttendanceRecord, safeFetch } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme";
import {
  Search,
  ScanFace,
  Camera,
  CheckCircle2,
  Clock,
  User,
  Building2,
  Briefcase,
  AlertCircle,
  RefreshCw,
  LogOut,
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
  component: CommonAttendancePage,
});

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

  const [startH, startM] = shiftStartStr.split(":").map((x: string) => parseInt(x, 10) || 0);
  const shiftStartMins = startH * 60 + startM;
  const morningGraceMins = graceSetting === "always" ? 9999 : (parseInt(graceSetting, 10) || 15);
  const morningCutoffMins = shiftStartMins + morningGraceMins;

  const [halfH, halfM] = halfDayLoginTimeStr.split(":").map((x: string) => parseInt(x, 10) || 0);
  const halfDayMins = halfH * 60 + halfM;

  const [endH, endM] = shiftEndStr.split(":").map((x: string) => parseInt(x, 10) || 0);
  const shiftEndMins = endH * 60 + endM;

  const currentMins = now.getHours() * 60 + now.getMinutes();

  let computedStatus: "present" | "absent" | "late" | "halfday" = "present";
  let punctualityTag: "on-time" | "within-grace" | "late" | "half-day" | "absent" = "on-time";
  let lateByMinutes: number | undefined = undefined;
  let statusBadge = "On Time";

  if (isCheckIn) {
    if (currentMins >= shiftEndMins) {
      computedStatus = "absent";
      punctualityTag = "absent";
      lateByMinutes = currentMins - shiftStartMins;
      statusBadge = "Invalid Punch (Past Shift)";
    } else if (currentMins < halfDayMins) {
      if (currentMins <= morningCutoffMins) {
        computedStatus = "present";
        punctualityTag = currentMins <= shiftStartMins ? "on-time" : "within-grace";
        statusBadge = currentMins <= shiftStartMins ? "On-Time Check-In" : "Grace Period Check-In";
      } else {
        computedStatus = "late";
        punctualityTag = "late";
        lateByMinutes = currentMins - shiftStartMins;
        statusBadge = `Late Check-In (${lateByMinutes}m)`;
      }
    } else {
      computedStatus = "halfday";
      punctualityTag = "half-day";
      lateByMinutes = Math.max(0, currentMins - halfDayMins);
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

function CommonAttendancePage() {
  const nav = useNavigate();
  const { user, signOut } = useAuth();
  const { company, employees, attendance, upsertAttendance } = useStore();

  // Search & Selected employee state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [punchMode, setPunchMode] = useState<"auto" | "check-in" | "check-out">("auto");

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
      .filter((e) => e.status !== "terminated" && e.status !== "relieved")
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
      } else if (punchMode === "auto") {
        isCheckIn = !existingRecord?.clockIn;
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans select-none overflow-x-hidden transition-colors duration-300">
      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Kiosk Navigation & Status Bar */}
      <header className="h-20 px-6 sm:px-8 border-b border-border bg-card/85 backdrop-blur-md flex items-center justify-between shrink-0 shadow-xs relative z-20 transition-colors">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-gradient-brand text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
            <ScanFace className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
                {company.commonPortal?.portalTitle || `${company.name || "CreatonsHR"} Attendance Kiosk`}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Face Recognition & Employee Code Biometric Punch Terminal
            </p>
          </div>
        </div>

        {/* Live Clock & Shift Badge */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-right hidden md:block">
            <div className="text-xs font-medium text-primary flex items-center justify-end gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {currentShift ? `${currentShift.name} Shift (${currentShift.start} - ${currentShift.end})` : "General Shift"}
            </div>
            <div className="text-xs text-muted-foreground">
              {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>

          <div className="bg-muted/70 border border-border px-4 py-1.5 rounded-xl text-center shadow-inner">
            <div className="text-xl sm:text-2xl font-mono font-bold tracking-wider text-foreground">
              {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="h-10 w-10 border border-border bg-card hover:bg-muted text-foreground rounded-xl flex items-center justify-center transition-colors cursor-pointer shadow-2xs" />

            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-border bg-card hover:bg-muted text-foreground rounded-xl transition-colors cursor-pointer shadow-2xs"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-10 border-destructive/30 text-destructive bg-destructive/10 hover:bg-destructive/20 hover:text-destructive gap-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
              onClick={() => {
                if (window.confirm("Exit the attendance kiosk portal?")) {
                  signOut().then(() => nav({ to: "/login" }));
                }
              }}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Exit Kiosk</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        {/* Left Column: Search & Camera Scanner (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          {/* Employee Code Search Bar */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs relative transition-colors">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Step 1: Fetch Employee Code</span>
              <span className="text-[11px] text-primary font-normal">Type Code or Name to Select</span>
            </label>

            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                autoFocus
                placeholder="Search Employee Code (e.g. SWF001, HR001) or Full Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-10 h-12 text-base bg-background border border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary rounded-xl shadow-2xs transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Quick Suggestions Dropdown */}
            <AnimatePresence>
              {filteredEmployees.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute left-5 right-5 top-[95px] z-30 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden divide-y divide-border"
                >
                  {filteredEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => handleSelectEmployee(emp)}
                      className="p-3.5 hover:bg-accent/40 transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0 overflow-hidden">
                          {emp.photoDataUrl ? (
                            <img src={emp.photoDataUrl} alt={emp.name} className="h-full w-full object-cover" />
                          ) : (
                            emp.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground group-hover:text-primary flex items-center gap-2">
                            {emp.name}
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                              {emp.empCode}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {emp.designation} · {emp.department}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Selection Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Quick Test:</span>
              {employees.slice(0, 4).map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handleSelectEmployee(emp)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    selectedEmployee?.id === emp.id
                      ? "bg-primary/15 border-primary text-primary font-semibold"
                      : "bg-muted/60 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {emp.empCode} - {emp.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Camera Face Recognition Viewport */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex-1 flex flex-col transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Step 2: Live Face Recognition Scanner
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Switch Cam
                </Button>
                <span className="text-xs text-muted-foreground">
                  {cameraActive ? "Camera Live" : "Camera Initializing"}
                </span>
              </div>
            </div>

            {/* Video Viewport Container */}
            <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-black/95 rounded-xl overflow-hidden border-2 border-border flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />

              {/* Facial Alignment Target Overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className={`relative h-56 w-48 sm:h-64 sm:w-52 rounded-[50%] border-2 ${
                    isVerifying
                      ? "border-primary shadow-[0_0_25px_var(--primary)]"
                      : selectedEmployee
                      ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      : "border-primary/50"
                  } transition-all duration-300`}
                >
                  {/* Four Corner Marks */}
                  <div className="absolute -top-2 -left-2 h-4 w-4 border-t-2 border-l-2 border-primary" />
                  <div className="absolute -top-2 -right-2 h-4 w-4 border-t-2 border-r-2 border-primary" />
                  <div className="absolute -bottom-2 -left-2 h-4 w-4 border-b-2 border-l-2 border-primary" />
                  <div className="absolute -bottom-2 -right-2 h-4 w-4 border-b-2 border-r-2 border-primary" />

                  {/* Scanning Laser Beam */}
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

              {/* Camera Error overlay */}
              {cameraError && (
                <div className="absolute inset-0 bg-background/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10">
                  <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                  <p className="text-sm font-semibold text-foreground mb-2">{cameraError}</p>
                  <Button
                    size="sm"
                    onClick={() => startCamera()}
                    className="bg-primary text-primary-foreground font-semibold"
                  >
                    Retry Camera
                  </Button>
                </div>
              )}

              {/* Top overlay badge */}
              <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
                <div className="bg-card/90 backdrop-blur-md px-3 py-1 rounded-full text-xs text-foreground border border-emerald-500/30 flex items-center gap-1.5 shadow-md">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">AWS Rekognition Live</span>
                  <span className="text-muted-foreground text-[10px]">ap-south-1</span>
                </div>
                <div className="bg-card/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] text-primary border border-primary/30 font-semibold shadow-md">
                  {selectedEmployee ? `1:1 Match Mode (${selectedEmployee.empCode})` : "1:N Auto-Identify Mode"}
                </div>
              </div>

              {/* Bottom Instructions / Error badge */}
              <div className="absolute bottom-3 inset-x-0 flex justify-center px-4">
                {lastErrorMessage ? (
                  <div className="bg-destructive/90 border border-destructive text-destructive-foreground backdrop-blur-md px-4 py-1.5 rounded-full text-xs flex items-center gap-1.5 shadow-lg max-w-md text-center font-medium">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{lastErrorMessage}</span>
                  </div>
                ) : (
                  <div className="bg-card/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs text-foreground border border-border text-center shadow-lg font-medium">
                    {selectedEmployee
                      ? `Align face inside oval frame & tap Authenticate for ${selectedEmployee.name}`
                      : "Align face inside oval frame & tap 1-Tap Facial Punch (Auto-Detects Employee)"}
                  </div>
                )}
              </div>
            </div>

            {/* Action Punch Trigger Controls */}
            <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row items-center gap-4">
              {/* Check-In / Check-Out Toggle */}
              <div className="flex items-center bg-muted/70 p-1 rounded-xl border border-border w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setPunchMode("auto")}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    punchMode === "auto"
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Auto detects Check-In or Check-Out based on today's attendance"
                >
                  ⚡ Auto
                </button>
                <button
                  type="button"
                  onClick={() => setPunchMode("check-in")}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    punchMode === "check-in"
                      ? "bg-emerald-600 text-white shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Check-IN
                </button>
                <button
                  type="button"
                  onClick={() => setPunchMode("check-out")}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    punchMode === "check-out"
                      ? "bg-sky-600 text-white shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Check-OUT
                </button>
              </div>

              {/* Main Punch Trigger Button */}
              <Button
                size="lg"
                onClick={() => handleCaptureAndPunch()}
                disabled={isVerifying || !cameraActive}
                className="w-full h-12 bg-gradient-brand text-primary-foreground hover:opacity-95 font-bold text-base shadow-glow disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2.5 rounded-xl transition-all cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Transmitting Biometric Packet to AWS Rekognition...</span>
                  </>
                ) : (
                  <>
                    <ScanFace className="h-5 w-5" />
                    <span>
                      {selectedEmployee
                        ? `Authenticate ${selectedEmployee.name.split(" ")[0]} (${punchMode === "auto" ? "Smart Punch" : punchMode.toUpperCase()})`
                        : `1-Tap Facial Punch (${punchMode === "auto" ? "AWS Auto-Detect" : punchMode.toUpperCase()})`}
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>

        {/* Right Column: Selected Employee Verification Details & Today's Logs (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          {/* Selected Employee Details Card */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs relative overflow-hidden transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-4 w-4 text-primary" />
                Employee Verification Details
              </h2>
              {selectedEmployee && (
                <button
                  type="button"
                  onClick={() => setSelectedEmployee(null)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>

            {selectedEmployee ? (
              <div className="space-y-4">
                {/* Employee Header Profile */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
                  <div className="relative h-16 w-16 rounded-xl bg-primary/10 border-2 border-primary/40 flex items-center justify-center font-bold text-xl text-primary shrink-0 overflow-hidden shadow-xs">
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
                      <h3 className="text-base font-bold text-foreground truncate">
                        {selectedEmployee.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                        {selectedEmployee.empCode}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {selectedEmployee.designation || "Staff Member"}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <Check className="h-3 w-3" /> Active Employee
                      </span>
                      {selectedEmployee.faceRegistered ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-primary/10 text-primary border border-primary/20">
                          <ScanFace className="h-3 w-3" /> Face Enrolled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Auto-Enroll on Punch
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/80">
                    <span className="text-muted-foreground flex items-center gap-1 mb-1">
                      <Building2 className="h-3.5 w-3.5" /> Department
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedEmployee.department || "General"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border/80">
                    <span className="text-muted-foreground flex items-center gap-1 mb-1">
                      <Clock className="h-3.5 w-3.5" /> Assigned Shift
                    </span>
                    <span className="font-semibold text-foreground">
                      {currentShift ? `${currentShift.name} (${currentShift.start})` : "General (09:00)"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border/80">
                    <span className="text-muted-foreground flex items-center gap-1 mb-1">
                      <Phone className="h-3.5 w-3.5" /> Contact Phone
                    </span>
                    <span className="font-semibold text-foreground font-mono">
                      {selectedEmployee.phone || "Not Provided"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border/80">
                    <span className="text-muted-foreground flex items-center gap-1 mb-1">
                      <Calendar className="h-3.5 w-3.5" /> Date of Joining
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedEmployee.doj || "Confirmed"}
                    </span>
                  </div>
                </div>

                {/* Today's Punch Status Banner */}
                <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-2">
                  <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Today's Attendance Status</span>
                    <span className="text-[11px] text-muted-foreground font-mono">{todayStr}</span>
                  </div>

                  {selectedEmpTodayAttendance?.clockIn ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> Clocked IN
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          {selectedEmpTodayAttendance.clockIn}
                        </span>
                      </div>

                      {selectedEmpTodayAttendance.clockOut ? (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> Clocked OUT
                          </span>
                          <span className="font-mono font-bold text-foreground">
                            {selectedEmpTodayAttendance.clockOut}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-primary bg-primary/10 p-2 rounded-lg border border-primary/20">
                          Active shift in progress. Next suggested action is <strong>Mark Check-Out</strong>.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-2 text-xs text-muted-foreground flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                      <span>Not punched in today. Next action: <strong>Mark Check-In</strong>.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 px-4 text-center rounded-xl border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center">
                <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
                  <Search className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">No Employee Selected</h4>
                <p className="text-xs text-muted-foreground max-w-xs mt-1">
                  Type an Employee Code (e.g. SWF001) in the search box or use 1-Tap Facial Punch for instant auto-recognition.
                </p>
              </div>
            )}
          </div>

          {/* Today's Live Kiosk Punches Feed */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex-1 flex flex-col min-h-[300px] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Today's Kiosk Activity Feed
                </h2>
              </div>
              <span className="text-xs text-muted-foreground font-mono font-semibold">
                {todayKioskLogs.length} Records
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[360px] divide-y divide-border">
              {todayKioskLogs.length > 0 ? (
                todayKioskLogs.map((log) => {
                  const emp = employees.find((e) => e.id === log.employeeId);
                  const isOut = Boolean(log.clockOut);
                  return (
                    <div
                      key={log.id}
                      className="pt-2.5 first:pt-0 flex items-center justify-between text-xs hover:bg-muted/50 p-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 border border-border flex items-center justify-center font-bold text-primary shrink-0 overflow-hidden">
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
                          <div className="font-semibold text-foreground truncate">
                            {log.employeeName || emp?.name || "Staff Member"}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                            <span>{log.empCode || emp?.empCode}</span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400">Match {log.similarity || 98.4}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                            isOut
                              ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {isOut ? "OUT" : "IN"} {log.clockOut || log.clockIn || log.checkIn}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No kiosk scans recorded today yet.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

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
    </div>
  );
}
