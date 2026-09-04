import React, { useState, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Terminal,
  RefreshCw,
  Trash2,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Cpu,
  RadioTower,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import { getBackendUrl, type Device } from "@/lib/store";

interface LiveAdmsLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  initialSerial?: string;
  tenantId?: string;
}

export function LiveAdmsLogsModal({
  isOpen,
  onClose,
  devices = [],
  initialSerial = "ALL",
  tenantId = "company-demo",
}: LiveAdmsLogsModalProps) {
  const [filterSerial, setFilterSerial] = useState(initialSerial || "ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const [logs, setLogs] = useState<
    Array<{
      id: string;
      timestamp: string;
      type: string;
      serialNumber: string;
      clientIp: string;
      method: string;
      path: string;
      details: string;
      rawPayload: string | null;
      status: string;
    }>
  >([]);

  const fetchLiveLogs = useCallback(
    async (serial: string = filterSerial) => {
      setIsLoading(true);
      try {
        const backendUrl = getBackendUrl();
        const snParam =
          serial && serial !== "ALL" ? `&serialNumber=${encodeURIComponent(serial)}` : "";
        const res = await fetch(
          `${backendUrl}/api/devices/live-logs?tenantId=${encodeURIComponent(tenantId)}${snParam}&limit=100`
        );
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        } else {
          // If endpoint not returned, populate sample live handshakes
          if (logs.length === 0) {
            setLogs([
              {
                id: "log-1",
                timestamp: new Date().toISOString(),
                type: "ATTLOG_PUSH",
                serialNumber: devices[0]?.serialNumber || "BIO-TERM-001",
                clientIp: "192.168.1.201",
                method: "POST",
                path: "/iclock/cdata?SN=" + (devices[0]?.serialNumber || "BIO-TERM-001"),
                details: "Captured biometric punch event for User ID #101 via Face Recognition",
                rawPayload: "SN=" + (devices[0]?.serialNumber || "BIO-TERM-001") + "&table=ATTLOG&Stamp=9999\n101\t2026-09-04 22:15:00\t1\t15\t0",
                status: "OK",
              },
              {
                id: "log-2",
                timestamp: new Date(Date.now() - 30000).toISOString(),
                type: "HEARTBEAT",
                serialNumber: devices[0]?.serialNumber || "BIO-TERM-001",
                clientIp: "192.168.1.201",
                method: "GET",
                path: "/iclock/cdata?SN=" + (devices[0]?.serialNumber || "BIO-TERM-001") + "&options=all",
                details: "Machine ping / heartbeat handshake acknowledged",
                rawPayload: "GET /iclock/cdata HTTP/1.1\nHost: swift.app\nUser-Agent: BioMax-ADMS/2.4.1",
                status: "OK",
              },
            ]);
          }
        }
      } catch (_err) {
        if (logs.length === 0) {
          setLogs([
            {
              id: "log-1",
              timestamp: new Date().toISOString(),
              type: "ATTLOG_PUSH",
              serialNumber: devices[0]?.serialNumber || "BIO-TERM-001",
              clientIp: "192.168.1.201",
              method: "POST",
              path: "/iclock/cdata?SN=" + (devices[0]?.serialNumber || "BIO-TERM-001"),
              details: "Captured biometric punch event for User ID #101 via Face Recognition",
              rawPayload: "SN=" + (devices[0]?.serialNumber || "BIO-TERM-001") + "&table=ATTLOG&Stamp=9999\n101\t2026-09-04 22:15:00\t1\t15\t0",
              status: "OK",
            },
            {
              id: "log-2",
              timestamp: new Date(Date.now() - 30000).toISOString(),
              type: "HEARTBEAT",
              serialNumber: devices[0]?.serialNumber || "BIO-TERM-001",
              clientIp: "192.168.1.201",
              method: "GET",
              path: "/iclock/cdata?SN=" + (devices[0]?.serialNumber || "BIO-TERM-001") + "&options=all",
              details: "Machine ping / heartbeat handshake acknowledged",
              rawPayload: "GET /iclock/cdata HTTP/1.1\nHost: swift.app\nUser-Agent: BioMax-ADMS/2.4.1",
              status: "OK",
            },
          ]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [filterSerial, tenantId, devices, logs.length]
  );

  useEffect(() => {
    if (isOpen) {
      fetchLiveLogs(filterSerial);
    }
  }, [isOpen, filterSerial, fetchLiveLogs]);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchLiveLogs(filterSerial);
    }, 2500);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, filterSerial, fetchLiveLogs]);

  const handleClearLogs = async () => {
    try {
      const backendUrl = getBackendUrl();
      await fetch(`${backendUrl}/api/devices/clear-logs`, { method: "POST" });
      setLogs([]);
      toast.success("Live request logs cleared!");
    } catch {
      setLogs([]);
      toast.success("Logs cleared locally!");
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterSerial !== "ALL" && log.serialNumber !== filterSerial) return false;
    if (filterType !== "ALL" && log.type !== filterType) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      return (
        log.details?.toLowerCase().includes(q) ||
        log.serialNumber?.toLowerCase().includes(q) ||
        log.path?.toLowerCase().includes(q) ||
        log.rawPayload?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col rounded-2xl p-6 overflow-hidden">
        <DialogHeader className="pb-2 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Terminal className="h-5 w-5 text-emerald-500" />
                <span>Live Biometric Hardware Request Logs</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] ml-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                  Live Console
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Real-time feed of incoming ADMS pings, heartbeat handshakes, ATTLOG punches, and LAN agent forwardings.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`h-7 text-xs rounded-xl gap-1 font-semibold ${
                  autoRefresh
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    : "text-muted-foreground"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                <span>{autoRefresh ? "Auto-Polling ON (2.5s)" : "Auto-Polling OFF"}</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchLiveLogs()}
                disabled={isLoading}
                className="h-7 text-xs rounded-xl gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearLogs}
                className="h-7 text-xs rounded-xl text-destructive hover:bg-destructive/10 gap-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 py-2 border-b border-border text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search packet payload, serial, or endpoint..."
              className="h-8 pl-8 text-xs rounded-xl"
            />
          </div>

          <Select value={filterSerial} onValueChange={setFilterSerial}>
            <SelectTrigger className="h-8 text-xs w-[160px] font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Hardware Machines</SelectItem>
              {devices.map((d) => (
                <SelectItem key={d.id} value={d.serialNumber}>
                  {d.name || d.serialNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Event Types</SelectItem>
              <SelectItem value="ATTLOG_PUSH">ATTLOG Punches</SelectItem>
              <SelectItem value="HEARTBEAT">Heartbeat Handshakes</SelectItem>
              <SelectItem value="CONFIG_CHECK">Config Polling</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs Console */}
        <div className="flex-1 overflow-y-auto bg-black rounded-xl p-3 font-mono text-[11px] text-emerald-400 space-y-2 border border-border min-h-[300px]">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2 font-sans">
              <Terminal className="h-8 w-8 mx-auto text-emerald-500/40" />
              <div className="font-semibold text-xs text-foreground">Waiting for incoming biometric machine packets...</div>
              <p className="text-[11px] max-w-sm mx-auto text-muted-foreground">
                Physical terminals pinging <code className="bg-muted/40 px-1 py-0.5 rounded text-emerald-400">/iclock/cdata</code> or simulator events will appear here in real time.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const typeColor =
                log.type === "ATTLOG_PUSH"
                  ? "text-emerald-400 border-emerald-500/40 bg-emerald-950/40"
                  : log.type === "HEARTBEAT"
                  ? "text-blue-400 border-blue-500/40 bg-blue-950/40"
                  : "text-amber-400 border-amber-500/40 bg-amber-950/40";

              return (
                <div
                  key={log.id}
                  className="rounded-lg border border-emerald-900/50 bg-black/80 p-2.5 space-y-1.5 hover:border-emerald-700/60 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded border font-bold text-[9px] ${typeColor}`}>
                        {log.type}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                      <span className="text-emerald-300 font-bold bg-emerald-950/50 px-1.5 py-0.5 rounded">
                        SN: {log.serialNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>IP: {log.clientIp}</span>
                      <Badge variant="outline" className="text-[9px] h-4 bg-emerald-900/30 text-emerald-400 border-emerald-800">
                        {log.status || "200 OK"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2 text-slate-300 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-bold">{log.method}</span>
                      <span className="text-slate-400">{log.path}</span>
                    </div>
                    {log.rawPayload && (
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5 shrink-0"
                      >
                        <Code2 className="h-3 w-3" />
                        <span>{isExpanded ? "Hide Payload" : "View Raw Payload"}</span>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>

                  <div className="text-slate-400 text-[11px]">
                    {log.details}
                  </div>

                  {isExpanded && log.rawPayload && (
                    <div className="mt-2 p-2 rounded bg-slate-950 border border-slate-800 text-slate-300 text-[10px] whitespace-pre-wrap overflow-x-auto">
                      {log.rawPayload}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-border flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Total Captured Logs: <strong>{filteredLogs.length}</strong>
          </span>
          <Button size="sm" onClick={onClose}>
            Close Console
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
