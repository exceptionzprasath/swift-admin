import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, Loader2, ScanFace, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCaptured: (dataUrl: string) => void;
  title?: string;
};

export function FaceCapture({ open, onClose, onCaptured, title = "Face Verification" }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<"init" | "live" | "scanning" | "verified" | "error">("init");
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPhase("init");
    setErr("");
    (async () => {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          });
        } catch (innerErr) {
          console.warn("Retrying getUserMedia with simple video constraints:", innerErr);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setPhase("live");
      } catch (e: any) {
        let msg = e?.message || "Camera access denied";
        if (msg.includes("device not found") || msg.includes("NotFoundError") || msg.includes("DevicesNotFoundError")) {
          msg = "No webcam found. Please plug in a physical camera or check if another application is using it, then reload.";
        } else if (msg.includes("Permission denied") || msg.includes("NotAllowedError")) {
          msg = "Camera permission was denied. Please click the camera/settings icon in your browser's address bar to grant access.";
        }
        setErr(msg);
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setPhase("scanning");
    // Simulate liveness/matching delay
    await new Promise((r) => setTimeout(r, 900));
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1); // mirror to match preview
      ctx.drawImage(v, 0, 0, c.width, c.height);
    }
    const dataUrl = c.toDataURL("image/jpeg", 0.7);
    setPhase("verified");
    await new Promise((r) => setTimeout(r, 500));
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCaptured(dataUrl);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <ScanFace className="h-5 w-5 text-primary" /> {title}
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[4/3] bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover -scale-x-100"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Face frame overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className={`h-56 w-44 rounded-[50%] border-2 ${
              phase === "verified" ? "border-emerald-400" : "border-primary/80"
            } shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-colors`} />
          </div>

          {phase === "scanning" && (
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
          )}
          {phase === "init" && (
            <div className="absolute inset-0 grid place-items-center text-white/80 text-sm">
              <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Starting camera…</div>
            </div>
          )}
          {phase === "error" && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 text-white p-6 text-center text-sm">
              {err || "Unable to access camera"}
            </div>
          )}
          {phase === "verified" && (
            <div className="absolute inset-0 grid place-items-center bg-emerald-500/25 text-white">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <CheckCircle2 className="h-6 w-6" /> Face Verified
              </div>
            </div>
          )}

          <div className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-1 text-[11px] text-white/90">
            {phase === "live" && "Live · position your face inside the frame"}
            {phase === "scanning" && "Scanning…"}
            {phase === "verified" && "Matched"}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 p-4">
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button
            onClick={capture}
            disabled={phase !== "live"}
            className="bg-gradient-brand text-white"
          >
            {phase === "scanning" ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning</>
            ) : (
              <><Camera className="h-4 w-4 mr-2" /> Capture & Verify</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
