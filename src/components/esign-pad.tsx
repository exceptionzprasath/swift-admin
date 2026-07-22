import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PenLine, Type, Upload, RotateCcw, Check } from "lucide-react";

type Props = {
  onSign: (dataUrl: string, meta: { signedBy: string; method: "draw" | "type" | "upload" }) => void;
  defaultName?: string;
  compact?: boolean;
};

export function ESignPad({ onSign, defaultName = "", compact }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [name, setName] = useState(defaultName);
  const [typed, setTyped] = useState(defaultName);
  const [hasStroke, setHasStroke] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * dpr;
    c.height = c.offsetHeight * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasStroke(true);
  };
  const end = () => { drawing.current = false; };

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setHasStroke(false);
  };

  const commitDrawn = () => {
    if (!canvasRef.current || !hasStroke) return;
    onSign(canvasRef.current.toDataURL("image/png"), { signedBy: name || "Signatory", method: "draw" });
  };

  const commitTyped = () => {
    if (!typed.trim()) return;
    const c = document.createElement("canvas");
    c.width = 600; c.height = 160;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#0f172a";
    ctx.font = "italic 56px 'Brush Script MT', 'Segoe Script', cursive";
    ctx.textBaseline = "middle";
    ctx.fillText(typed, 30, 80);
    onSign(c.toDataURL("image/png"), { signedBy: typed, method: "type" });
  };

  const upload = (f: File) => {
    const r = new FileReader();
    r.onload = () => onSign(String(r.result), { signedBy: name || "Signatory", method: "upload" });
    r.readAsDataURL(f);
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <Tabs defaultValue="draw">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="draw"><PenLine className="h-3.5 w-3.5 mr-1" />Draw</TabsTrigger>
          <TabsTrigger value="type"><Type className="h-3.5 w-3.5 mr-1" />Type</TabsTrigger>
          <TabsTrigger value="upload"><Upload className="h-3.5 w-3.5 mr-1" />Upload</TabsTrigger>
        </TabsList>
        <TabsContent value="draw" className="space-y-2">
          <div className="rounded-lg border border-dashed border-border bg-white">
            <canvas
              ref={canvasRef}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
              className="block w-full h-32 cursor-crosshair touch-none"
            />
          </div>
          <div className="flex gap-2">
            <Input placeholder="Signatory name" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
            <Button size="sm" variant="ghost" onClick={clear}><RotateCcw className="h-3.5 w-3.5" /></Button>
            <Button size="sm" onClick={commitDrawn} disabled={!hasStroke} className="bg-gradient-brand text-white">
              <Check className="h-3.5 w-3.5 mr-1" /> Apply
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="type" className="space-y-2">
          <Input placeholder="Type your full name" value={typed} onChange={(e) => setTyped(e.target.value)} className="text-2xl italic font-serif h-14" />
          <Button size="sm" onClick={commitTyped} disabled={!typed.trim()} className="bg-gradient-brand text-white w-full">
            <Check className="h-3.5 w-3.5 mr-1" /> Apply typed signature
          </Button>
        </TabsContent>
        <TabsContent value="upload" className="space-y-2">
          <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          <p className="text-[11px] text-muted-foreground">Upload scanned signature (PNG/JPG).</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
