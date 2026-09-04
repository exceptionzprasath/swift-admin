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

const AGENT_JS_CODE = `const ZKLib = require('node-zklib');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const net = require('net');
const os = require('os');

// Defensive patch for node-zklib to prevent null subarray crash on device timeout
try {
  const ZKLibTCP = require('node-zklib/zklibtcp');
  const { createTCPHeader, decodeTCPHeader, checkNotEventTCP } = require('node-zklib/utils');
  const { COMMANDS, MAX_CHUNK } = require('node-zklib/constants');

  ZKLibTCP.prototype.readWithBuffer = function (reqData, cb) {
    var self = this;
    return new Promise(function (resolve, reject) {
      self.replyId++;
      var buf = createTCPHeader(COMMANDS.CMD_DATA_WRRQ, self.sessionId, self.replyId, reqData);

      self.requestData(buf)
        .then(function (reply) {
          if (!reply || reply.length < 16) {
            return reject(new Error('Device returned empty or invalid response buffer on port 4370'));
          }

          var header = decodeTCPHeader(reply.subarray(0, 16));
          switch (header.commandId) {
            case COMMANDS.CMD_DATA: {
              return resolve({ data: reply.subarray(16), mode: 8 });
            }
            case COMMANDS.CMD_ACK_OK:
            case COMMANDS.CMD_PREPARE_DATA: {
              var recvData = reply.subarray(16);
              if (!recvData || recvData.length < 5) {
                return reject(new Error('Device response payload too short'));
              }
              var size = recvData.readUIntLE(1, 4);
              var remain = size % MAX_CHUNK;
              var numberChunks = Math.round(size - remain) / MAX_CHUNK;
              var totalPackets = numberChunks + (remain > 0 ? 1 : 0);
              var replyData = Buffer.from([]);
              var totalBuffer = Buffer.from([]);
              var realTotalBuffer = Buffer.from([]);

              var timeout = 10000;
              var timer = setTimeout(function () {
                internalCallback(replyData, new Error('TIMEOUT WHEN RECEIVING PACKET'));
              }, timeout);

              var internalCallback = function (data, err) {
                if (timer) clearTimeout(timer);
                resolve({ data: data, err: err || null });
              };

              var handleOnData = function (packet) {
                if (checkNotEventTCP(packet)) return;
                if (timer) clearTimeout(timer);
                timer = setTimeout(function () {
                  internalCallback(replyData, new Error('TIMEOUT ON PACKETS REMAINING: ' + totalPackets));
                }, timeout);

                totalBuffer = Buffer.concat([totalBuffer, packet]);
                var packetLength = totalBuffer.readUIntLE(4, 2);
                if (totalBuffer.length >= 8 + packetLength) {
                  realTotalBuffer = Buffer.concat([realTotalBuffer, totalBuffer.subarray(16, 8 + packetLength)]);
                  totalBuffer = totalBuffer.subarray(8 + packetLength);

                  if (
                    (totalPackets > 1 && realTotalBuffer.length === MAX_CHUNK + 8) ||
                    (totalPackets === 1 && realTotalBuffer.length === remain + 8)
                  ) {
                    replyData = Buffer.concat([replyData, realTotalBuffer.subarray(8)]);
                    totalBuffer = Buffer.from([]);
                    realTotalBuffer = Buffer.from([]);

                    totalPackets -= 1;
                    if (cb) cb(replyData.length, size);

                    if (totalPackets <= 0) {
                      internalCallback(replyData);
                    }
                  }
                }
              };

              self.socket.on('data', handleOnData);

              for (var i = 0; i < totalPackets; i++) {
                var sizeReq = i === totalPackets - 1 ? remain : MAX_CHUNK;
                self.sendChunkRequest(i * MAX_CHUNK, sizeReq);
              }
              break;
            }
            default: {
              return reject(new Error('Invalid command response code: ' + header.commandId));
            }
          }
        })
        .catch(function (err) {
          reject(err);
        });
    });
  };

  function parseZKTimeToDate(time) {
    if (!time || typeof time !== 'number' || isNaN(time) || time <= 0) return null;
    try {
      const second = time % 60;
      time = Math.floor(time / 60);
      const minute = time % 60;
      time = Math.floor(time / 60);
      const hour = time % 24;
      time = Math.floor(time / 24);
      const day = (time % 31) + 1;
      time = Math.floor(time / 31);
      const month = time % 12;
      time = Math.floor(time / 12);
      const year = time + 2000;
      
      const d = new Date(year, month, day, hour, minute, second);
      return isNaN(d.getTime()) || year < 2020 ? null : d;
    } catch (e) {
      return null;
    }
  }

  function customDecodeRecordData40(recordData) {
    const userSn = recordData.readUIntLE(0, 2);
    const deviceUserId = recordData.slice(2, 26).toString('ascii').split('\\0').shift().trim();
    const verifyType = recordData.length > 26 ? recordData.readUInt8(26) : 1;
    const time = parseZKTimeToDate(recordData.readUInt32LE(27));
    return { userSn, deviceUserId, verifyType, time };
  }
} catch (patchErr) {
  console.warn('node-zklib patch warning:', patchErr.message);
}

const configPath = path.join(__dirname, 'config.json');
let config = {
  deviceIp: '192.168.1.201',
  devicePort: 4370,
  deviceSerial: 'BIO-TERM-001',
  cloudApiUrl: 'http://localhost:5000',
  pollIntervalSeconds: 3
};

if (fs.existsSync(configPath)) {
  try {
    config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
  } catch (e) {
    console.error('Error reading config.json:', e);
  }
}

let zk = new ZKLib(config.deviceIp, config.devicePort, 10000, 4000);
let isConnected = false;
let processedPunches = new Set();
let consecutiveFailures = 0;

async function sendHeartbeat() {
  try {
    await axios.post(\`\${config.cloudApiUrl}/api/devices/heartbeat\`, {
      serialNumber: config.deviceSerial,
      status: 'ONLINE',
      ipAddress: config.deviceIp,
      timestamp: new Date().toISOString()
    });
  } catch (err) {}
}

async function pollAttendanceLogs() {
  if (!isConnected) return;
  try {
    const logs = await zk.getAttendances();
    if (logs && logs.data && Array.isArray(logs.data)) {
      const newLogs = logs.data.filter(l => {
        const key = \`\${l.deviceUserId}_\${new Date(l.recordTime).getTime()}\`;
        if (processedPunches.has(key)) return false;
        processedPunches.add(key);
        return true;
      });

      if (newLogs.length > 0) {
        console.log(\`Captured \${newLogs.length} new punch(es) from \${config.deviceSerial}\`);
        await axios.post(\`\${config.cloudApiUrl}/api/devices/punch-batch\`, {
          serialNumber: config.deviceSerial,
          punches: newLogs.map(p => ({
            employeeId: p.deviceUserId,
            timestamp: new Date(p.recordTime).toISOString(),
            punchType: p.verifyType === 15 ? 'FACE_RECOGNITION' : p.verifyType === 3 ? 'CARD_RFID' : 'FINGERPRINT',
            state: 'CHECK_IN'
          }))
        });
      }
    }
  } catch (err) {
    console.warn('Poll attendance warning:', err.message);
  }
}

async function connectToDevice() {
  while (true) {
    if (!isConnected) {
      try {
        console.log(\`Connecting to biometric machine at \${config.deviceIp}:\${config.devicePort}...\`);
        await zk.createSocket();
        isConnected = true;
        consecutiveFailures = 0;
        console.log(\`Connected to \${config.deviceSerial} on Port \${config.devicePort}! Ready for live punches.\`);
        await sendHeartbeat();
      } catch (err) {
        consecutiveFailures++;
        console.error(\`Could not connect to \${config.deviceIp}:\${config.devicePort} (\${err.message})\`);
        isConnected = false;
        try { await zk.disconnect(); } catch (e) {}
      }
    }

    if (isConnected) {
      await pollAttendanceLogs();
      await sendHeartbeat();
    }

    await new Promise(r => setTimeout(r, config.pollIntervalSeconds * 1000));
  }
}

process.on('uncaughtException', (err) => {
  console.warn('Socket recovered:', err.message);
  isConnected = false;
});

connectToDevice().catch(console.error);

process.on('SIGINT', async () => {
  console.log('Stopping Biometric Sync Agent...');
  try { await zk.disconnect(); } catch (e) {}
  process.exit(0);
});
`;

const PACKAGE_JSON_CONTENT = JSON.stringify(
  {
    name: "swift-biometric-local-agent",
    version: "1.0.0",
    description: "Universal Local Sync Agent for eSSL, ZKTeco, and BioMax Biometric Terminals (Port 4370)",
    main: "agent.js",
    scripts: {
      start: "node agent.js",
    },
    dependencies: {
      axios: "^1.7.9",
      dotenv: "^16.4.7",
      "node-zklib": "^1.3.0",
    },
  },
  null,
  2
);

const START_BAT_CONTENT = `@echo off
title SWIFT Biometric Cloud Sync Agent
cd /d "%~dp0"
echo ================================================================
echo  SWIFT Biometric Cloud Sync Agent (Port 4370 Bridge)
echo ================================================================
echo.

if not exist "node_modules" (
    echo [Setup] First time setup: Installing required biometric drivers...
    call npm install
    echo [Setup] Installation complete!
    echo.
)

echo [Connecting] Starting Biometric Sync Engine...
echo.
node agent.js
pause
`;

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
  const [cloudApiUrl, setCloudApiUrl] = useState(
    typeof window !== "undefined" ? window.location.origin : getBackendUrl()
  );
  const [isZipping, setIsZipping] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const agentConfigJson = JSON.stringify(
    {
      deviceIp: deviceIp.trim() || "192.168.1.201",
      devicePort: 4370,
      deviceSerial: selectedDeviceSn.trim() || "BIO-TERM-001",
      cloudApiUrl: cloudApiUrl.trim() || (typeof window !== "undefined" ? window.location.origin : getBackendUrl()),
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
