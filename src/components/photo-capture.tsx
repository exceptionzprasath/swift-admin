import { useState } from "react";
import { FaceCapture } from "./face-capture";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

type Props = {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  name?: string;
  size?: "sm" | "md" | "lg";
};

function initials(n: string) {
  return n.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
}

export function PhotoCapture({ value, onChange, name = "", size = "md" }: Props) {
  const [camOpen, setCamOpen] = useState(false);
  const dim = size === "lg" ? "h-28 w-28" : size === "sm" ? "h-14 w-14" : "h-20 w-20";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";

  return (
    <div className="flex items-center gap-3">
      <div className={`${dim} rounded-full ring-2 ring-primary/30 bg-primary/10 text-primary grid place-items-center overflow-hidden shrink-0 shadow-soft`}>
        {value ? (
          <img src={value} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className={`font-semibold ${text}`}>{initials(name)}</span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" type="button" onClick={() => setCamOpen(true)}>
            <Camera className="h-3.5 w-3.5 mr-1" /> Camera
          </Button>
          {value && (
            <Button size="sm" variant="ghost" type="button" onClick={() => onChange(undefined)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">Employee photo — used across HRMS, org chart, ID card.</p>
      </div>
      <FaceCapture open={camOpen} onClose={() => setCamOpen(false)} onCaptured={(url) => onChange(url)} title="Capture Employee Photo" />
    </div>
  );
}
