import React, { useState } from "react";
import {
  Cpu,
  Server,
  Wifi,
  Radio,
  HardDrive,
  Plus,
  HelpCircle,
  Copy,
  Edit3,
  Trash2,
  Search,
  LayoutGrid,
  List,
  Layers,
  MapPin,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { type Device } from "@/lib/store";
import { toast } from "sonner";

interface DeviceManagerHubProps {
  devices: Device[];
  branches: Array<{ id: string; name: string }>;
  onOpenRegisterDevice: (device?: Device) => void;
  onOpenHardwareBridge: () => void;
  onDeleteDevice: (device: Device) => void;
}

export function DeviceManagerHub({
  devices = [],
  branches = [],
  onOpenRegisterDevice,
  onOpenHardwareBridge,
  onDeleteDevice,
}: DeviceManagerHubProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDevices = devices.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      d.name?.toLowerCase().includes(q) ||
      d.serialNumber?.toLowerCase().includes(q) ||
      d.branchName?.toLowerCase().includes(q) ||
      d.model?.toLowerCase().includes(q)
    );
  });

  const onlineCount = devices.filter((d) => d.status !== "OFFLINE").length;

  return (
    <div className="space-y-4">
      {/* Banner & Actions Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-primary/10 via-background to-card p-5 rounded-2xl border border-primary/20 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-base text-foreground">
              Biometric Terminal Hub
            </h3>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
              ADMS Push Engine Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Connect multiple physical fingerprint, facial recognition, and RFID machines across company branches. Supports direct Cloud ADMS push and local Port 4370 sync bridge.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenHardwareBridge}
            className="h-8 text-xs rounded-xl gap-1.5 border-primary/30 text-primary hover:bg-primary/10 font-semibold"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Connection Bridge & ZIP Agent</span>
          </Button>

          <Button
            size="sm"
            onClick={() => onOpenRegisterDevice()}
            className="h-8 text-xs rounded-xl gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Register Terminal</span>
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="rounded-xl border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span>Registered Machines</span>
            <Server className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-display text-foreground">
            {devices.length}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Biometric Hardware Terminals configured
          </div>
        </Card>

        <Card className="rounded-xl border-emerald-500/20 bg-emerald-500/5 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 text-xs mb-1">
            <span>Online / Active Now</span>
            <Wifi className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-display text-emerald-600">
            {onlineCount}
          </div>
          <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300 mt-0.5">
            Ready to receive real-time punches
          </div>
        </Card>
      </div>

      {/* View Switcher & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative min-w-[240px] flex-1 sm:flex-initial">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search terminal name, SN, branch, model..."
            className="pl-8 h-8 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              viewMode === "grid"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              viewMode === "table"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Table View"
          >
            <List className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Grid or Table Display */}
      {filteredDevices.length === 0 ? (
        <Card className="rounded-2xl border-border p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
            <Cpu className="h-6 w-6" />
          </div>
          <div className="font-semibold text-foreground text-sm">
            {devices.length === 0
              ? "No Biometric Machines Registered Yet"
              : "No Machines Match Your Search"}
          </div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {devices.length === 0
              ? "Register your BioMax, eSSL, or ZKTeco machine serial numbers to start capturing live fingerprint and facial recognition attendance."
              : "Try adjusting your search query or clear the filter."}
          </p>
          {devices.length === 0 && (
            <Button
              size="sm"
              onClick={() => onOpenRegisterDevice()}
              className="h-8 text-xs rounded-xl gap-1.5 bg-primary text-primary-foreground font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register First Machine</span>
            </Button>
          )}
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((dev) => {
            const isOnline = dev.status !== "OFFLINE";
            return (
              <Card
                key={dev.id}
                className="rounded-2xl border-border bg-card p-4.5 hover:border-primary/40 hover:shadow-xs transition-all space-y-3.5 relative group"
              >
                {/* Header with status pill */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="font-bold text-foreground text-sm flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">{dev.name}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground/70" />
                      <span>{dev.branchName || "Head Office"}</span>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 gap-1 ${
                      isOnline
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                      }`}
                    />
                    {isOnline ? "Online" : "Offline"}
                  </Badge>
                </div>

                {/* Serial Number Box */}
                <div className="bg-muted/40 p-2.5 rounded-xl border border-border flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                      Serial Number (SN)
                    </span>
                    <span className="font-mono font-bold text-xs text-foreground">
                      {dev.serialNumber}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(dev.serialNumber);
                      toast.success("Copied machine serial number!");
                    }}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-primary rounded-lg"
                    title="Copy SN"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Hardware Details */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Model</span>
                    <strong className="text-foreground truncate block">{dev.model || "BioMax ADMS"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">LAN IP / Port</span>
                    <span className="font-mono text-foreground truncate block">
                      {dev.ipAddress || "192.168.1.201"}:4370
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-2 border-t border-border flex items-center justify-between gap-1">
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground/70" />
                    <span>
                      {dev.lastHeartbeat
                        ? new Date(dev.lastHeartbeat).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Active"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenRegisterDevice(dev)}
                      className="h-7 w-7 p-0 text-primary rounded-lg"
                      title="Edit Terminal"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteDevice(dev)}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg"
                      title="Delete Terminal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="rounded-2xl border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <th className="p-3">Terminal Name</th>
                  <th className="p-3">Serial Number (SN)</th>
                  <th className="p-3">Branch Location</th>
                  <th className="p-3">Model</th>
                  <th className="p-3">Protocol Status</th>
                  <th className="p-3">LAN IP Address</th>
                  <th className="p-3">Last Heartbeat</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDevices.map((dev) => (
                  <tr key={dev.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-foreground text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {dev.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        ID: {dev.id}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold bg-muted px-2 py-0.5 rounded-md border border-border">
                          {dev.serialNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(dev.serialNumber);
                            toast.success("Copied machine serial number!");
                          }}
                          className="text-muted-foreground hover:text-primary p-1 rounded"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                    <td className="p-3 font-medium text-foreground">
                      {dev.branchName || "Head Office"}
                    </td>

                    <td className="p-3 text-muted-foreground">
                      {dev.model || "BioMax / eSSL ADMS"}
                    </td>

                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          dev.status !== "OFFLINE"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {dev.status !== "OFFLINE" ? "ONLINE" : "OFFLINE"}
                      </Badge>
                    </td>

                    <td className="p-3 font-mono text-[11px] text-muted-foreground">
                      {dev.ipAddress || "192.168.1.201"}:4370
                    </td>

                    <td className="p-3 text-muted-foreground text-[11px]">
                      {dev.lastHeartbeat
                        ? new Date(dev.lastHeartbeat).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })
                        : "Active"}
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onOpenRegisterDevice(dev)}
                          className="h-7 text-[11px] rounded-lg text-primary"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteDevice(dev)}
                          className="h-7 text-[11px] rounded-lg text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
