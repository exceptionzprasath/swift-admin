// Compliance event bus — decouples the rest of the platform from the
// compliance store. Modules import `emitCompliance` and fire events; the
// compliance store subscribes once and runs the rule engine.

import type { ComplianceEventKey } from "./compliance";

export type ComplianceEventPayload = {
  subject: string;                 // "Priya Sharma" / "Bengaluru Unit-2"
  by?: string;
  note?: string;
  meta?: Record<string, unknown>;  // extra context (branchId, deptId, etc.)
};

type Listener = (event: ComplianceEventKey, payload: ComplianceEventPayload) => void;
const listeners = new Set<Listener>();

export function onCompliance(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function emitCompliance(event: ComplianceEventKey, payload: ComplianceEventPayload) {
  for (const l of listeners) {
    try { l(event, payload); } catch { /* no-op — bus never throws */ }
  }
}
