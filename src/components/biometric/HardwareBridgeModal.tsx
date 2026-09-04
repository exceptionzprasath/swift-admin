import React, { useState } from "react";
import JSZip from "jszip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Cpu,
  Layers,
  Globe,
  Terminal,
  Download,
  Copy,
  Check,
  HardDrive,
  Loader2,
  FileCode,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { getBackendUrl, type Device } from "@/lib/store";
import { useAuth } from "@/lib/auth";

import agentJsSource from "@/device_attendance/agent/agent.js?raw";
import packageJsonSource from "@/device_attendance/agent/package.json?raw";
import startBatSource from "@/device_attendance/agent/start-agent.bat?raw";

const AGENT_JS_CODE = agentJsSource;
const PACKAGE_JSON_CONTENT = packageJsonSource;
const START_BAT_CONTENT = startBatSource;

interface HardwareBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  companyName?: string;
}

export function HardwareBridgeModal({
  isOpen,
  onClose,
  devices = [],
  companyName = "SWIFT Organization",
}: HardwareBridgeModalProps) {
  const [activeMode, setActiveMode] = useState<"agent" | "cloud">("agent");
  const [selectedDeviceSn, setSelectedDeviceSn] = useState(
    devices[0]?.serialNumber || "NFZ8235301513"
  );
  const [deviceIp, setDeviceIp] = useState("192.168.1.201");
  const [cloudApiUrl, setCloudApiUrl] = useState(() => {
    const backend = getBackendUrl();
    if (backend && backend.startsWith("http")) return backend;
    if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return window.location.origin;
    }
    return "https://attendance-backend-production-48ca.up.railway.app";
  });
  const [isZipping, setIsZipping] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const { activeTenantId } = useAuth();
  const tenantId = activeTenantId || "company-demo";

  if (!isOpen) return null;

  const agentConfigJson = JSON.stringify(
    {
      tenantId: tenantId,
      deviceIp: deviceIp.trim() || "192.168.1.201",
      devicePort: 4370,
      deviceSerial: selectedDeviceSn.trim() || "BIO-TERM-001",
      cloudApiUrl: cloudApiUrl.trim() || "https://attendance-backend-production-48ca.up.railway.app",
      pollIntervalSeconds: 3,
    },
    null,
    2
  );

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDownloadConfig = () => {
    const blob = new Blob([agentConfigJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded config.json!");
  };

  const handleDynamicZipDownload = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      const folderName = `swift-biometric-agent-${selectedDeviceSn || "terminal"}`;
      const root = zip.folder(folderName);

      if (root) {
        root.file("config.json", agentConfigJson);
        root.file("agent.js", AGENT_JS_CODE);
        root.file("package.json", PACKAGE_JSON_CONTENT);
        root.file("start-agent.bat", START_BAT_CONTENT);
        root.file(
          "README.txt",
          `================================================================
SWIFT UNIVERSAL BIOMETRIC CLOUD SYNC AGENT
================================================================

Company: ${companyName}
Configured for Terminal SN: ${selectedDeviceSn || "BIO-TERM-001"}
Target Machine Local IP: ${deviceIp || "192.168.1.201"}:4370
Cloud Endpoint: ${cloudApiUrl}

HOW TO RUN:
1. Ensure this PC is connected to the same LAN / WiFi as the biometric machine.
2. Double-click "start-agent.bat".
3. On first run, it will automatically install lightweight drivers (node-zklib).
4. Punches will stream directly to SWIFT Admin in real time!
`
        );
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${folderName}.zip successfully!`);
    } catch (err: any) {
      console.error("Error generating dynamic agent zip:", err);
      toast.error("Could not generate ZIP: " + err.message);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col rounded-2xl p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                Biometric Hardware Connection Hub
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                  Multi-Machine Ready
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Connect multiple on-premise BioMax, eSSL, or ZKTeco machines via Local LAN Agent (Port 4370) or Direct Cloud ADMS Push.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-3 my-3">
          <button
            type="button"
            onClick={() => setActiveMode("agent")}
            className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
              activeMode === "agent"
                ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/30"
                : "bg-card border-border text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <Layers className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
            <div>
              <div className="font-bold text-xs text-foreground">Mode 1: Local LAN Desktop Agent (Port 4370)</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                eSSL X 2008, i9C, K20, BioMax on local office WiFi/Ethernet without direct WAN
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("cloud")}
            className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
              activeMode === "cloud"
                ? "bg-emerald-500/10 border-emerald-500 text-foreground ring-1 ring-emerald-500/30"
                : "bg-card border-border text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <Globe className="w-5 h-5 mt-0.5 shrink-0 text-emerald-600" />
            <div>
              <div className="font-bold text-xs text-foreground">Mode 2: Direct Cloud ADMS Push</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                BioMax N-BM2000, SpeedFace, ZKTeco iClock with built-in Cloud Server settings
              </div>
            </div>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {activeMode === "agent" ? (
            <div className="space-y-4">
              {/* Dynamic Agent Generator Card */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    <span>Dynamic Agent Package Generator (Client PC)</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    <Zap className="w-3 h-3 mr-1" />
                    1-Click Ready
                  </Badge>
                </div>

                <p className="text-muted-foreground">
                  Select a machine or enter details. We will build a pre-configured ZIP bundle containing the background sync service, startup batch file, and exact driver configuration.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Machine Serial Number (SN)</Label>
                    <Input
                      value={selectedDeviceSn}
                      onChange={(e) => setSelectedDeviceSn(e.target.value)}
                      placeholder="e.g. NFZ8235301513 or BIO-001"
                      className="h-8 text-xs font-mono font-bold uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Terminal Local IP Address (Port 4370)</Label>
                    <Input
                      value={deviceIp}
                      onChange={(e) => setDeviceIp(e.target.value)}
                      placeholder="e.g. 192.168.1.201"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleDynamicZipDownload}
                    disabled={isZipping}
                    className="h-8 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
                  >
                    {isZipping ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>Download Customized Agent ZIP</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadConfig}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Download config.json</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(agentConfigJson, "Config JSON")}
                    className="h-8 gap-1.5 text-xs"
                  >
                    {copiedText === "Config JSON" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Config</span>
                  </Button>
                </div>
              </div>

              {/* Instructions Steps */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-2.5">
                <div className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Deployment Guide (Under 2 Minutes)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground leading-relaxed">
                  <li>Extract the downloaded <strong className="text-foreground">.zip</strong> folder onto any Windows PC on the same local office network.</li>
                  <li>Double click <strong className="text-foreground">start-agent.bat</strong>. The agent automatically checks Port 4370 and installs drivers.</li>
                  <li>The console will display <strong className="text-emerald-600 dark:text-emerald-400">"Connected to {selectedDeviceSn || 'Terminal'}! Ready for live punches"</strong>.</li>
                  <li>Employee fingerprint/face punches will instantly stream to SWIFT Admin and DynamoDB.</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cloud ADMS Direct Guide */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <div className="font-bold text-sm text-foreground flex items-center justify-between">
                  <span>Direct ADMS Push Parameters:</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                    Native ADMS Protocol
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] bg-background p-3 rounded-lg border border-border">
                  <div className="flex justify-between items-center py-1 border-b border-border sm:border-b-0 sm:border-r sm:pr-2">
                    <span className="text-muted-foreground">Server Address:</span>
                    <strong className="text-foreground">{typeof window !== "undefined" ? window.location.hostname : "localhost"}</strong>
                  </div>
                  <div className="flex justify-between items-center py-1 sm:pl-2">
                    <span className="text-muted-foreground">Server Port:</span>
                    <strong className="text-foreground">5000 / 443</strong>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border sm:border-b-0 sm:border-r sm:pr-2">
                    <span className="text-muted-foreground">Push Path:</span>
                    <strong className="text-foreground">/iclock/cdata</strong>
                  </div>
                  <div className="flex justify-between items-center py-1 sm:pl-2">
                    <span className="text-muted-foreground">Push Version:</span>
                    <strong className="text-foreground">2.4.1 / ADMS</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card space-y-2.5">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">
                  Terminal Screen Menu Navigation:
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                  <li>Press <strong className="text-foreground">M/OK</strong> on your biometric terminal keypad to open the Admin Menu.</li>
                  <li>Navigate to <strong className="text-foreground">Comm. (Communication) → Cloud Server / ADMS Setting</strong>.</li>
                  <li>Set <strong className="text-foreground">Server Address</strong> to your server domain or public IP.</li>
                  <li>Set <strong className="text-foreground">Server Port</strong> to <strong className="text-foreground">5000</strong> (or 80 / 443).</li>
                  <li>Enable <strong className="text-foreground">Domain Name Mode</strong> if using a web URL.</li>
                  <li>Save and reboot. A green cloud/globe icon will appear on the machine screen indicating successful live sync!</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Supports BioMax, eSSL, ZKTeco, and Realtime biometric hardware.
          </span>
          <Button onClick={onClose} variant="outline" size="sm">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
