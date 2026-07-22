// SWIFT AI — AI Trigger Engine
// Continuously evaluates the configurable Compliance Registry against
// current company state and emits actionable alerts.
// Nothing hardcoded — rules come from useComplianceRegistry entries.

import type { RegistryEntry } from "./compliance-registry-store";
import type { ComplianceProfile } from "./compliance";

export type AlertSeverity = "info" | "warn" | "critical";

export type ComplianceAlert = {
  id: string;              // deterministic — dedupes across scans
  entryId: string;
  kind: "event" | "time" | "conditional";
  severity: AlertSeverity;
  title: string;
  why: string;
  law: string;
  documents: string[];
  penalty?: string;
  suggestedAction: string;
  eventKey?: string;
  dueDate?: string;        // ISO
  createdAt: string;
};

// ── Applicability ──────────────────────────────────────────────────────────
export function isApplicable(e: RegistryEntry, p: ComplianceProfile): boolean {
  const a = e.applicability;
  if (!a) return true;
  if (a.minEmployees != null && p.employeeCount < a.minEmployees) return false;
  if (a.maxEmployees != null && p.employeeCount > a.maxEmployees) return false;
  if (a.minWomen != null && p.womenEmployees < a.minWomen) return false;
  if (a.states?.length && p.state && !a.states.some((s) => s.toLowerCase() === p.state.toLowerCase())) return false;
  if (a.industries?.length && p.industry && !a.industries.includes(p.industry)) return false;
  if (a.establishmentTypes?.length && !a.establishmentTypes.includes(p.establishmentType as never)) return false;
  if (a.requiresContractLabour && !p.contractLabour) return false;
  if (a.requiresHazardous && !p.hazardous) return false;
  if (a.requiresNightShift && !p.shiftOperations) return false;
  if (a.requiresPower && !p.powerUsed) return false;
  if (e.state && p.state && e.state.toLowerCase() !== p.state.toLowerCase()) return false;
  return true;
}

// ── Timing helpers ─────────────────────────────────────────────────────────
function daysUntil(iso: string): number {
  return Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000);
}

function nextDueDate(e: RegistryEntry): string | undefined {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const dueDay = e.dueDay ?? 0;
  const dueMonth = e.dueMonth ?? 0;

  switch (e.frequency) {
    case "monthly": {
      const target = new Date(Date.UTC(y, m - 1, Math.max(1, dueDay || 15)));
      if (target.getTime() < now.getTime()) target.setUTCMonth(target.getUTCMonth() + 1);
      return target.toISOString().slice(0, 10);
    }
    case "quarterly": {
      const nextQ = Math.floor(now.getUTCMonth() / 3) * 3 + 3; // month index of next quarter end
      return new Date(Date.UTC(y, nextQ, Math.max(1, dueDay || 15))).toISOString().slice(0, 10);
    }
    case "half_yearly": {
      const half = now.getUTCMonth() < 6 ? 6 : 12;
      return new Date(Date.UTC(y, half - 1, Math.max(1, dueDay || 15))).toISOString().slice(0, 10);
    }
    case "annual":
    case "financial_year":
    case "calendar_year": {
      const target = new Date(Date.UTC(y, Math.max(0, (dueMonth || 12) - 1), Math.max(1, dueDay || 31)));
      if (target.getTime() < now.getTime()) target.setUTCFullYear(y + 1);
      return target.toISOString().slice(0, 10);
    }
    case "biennial": {
      return new Date(Date.UTC(y + 1, Math.max(0, (dueMonth || 12) - 1), Math.max(1, dueDay || 31))).toISOString().slice(0, 10);
    }
    default:
      return undefined;
  }
}

// ── Alert builder ──────────────────────────────────────────────────────────
function severityFor(days: number, defaults: number[]): AlertSeverity {
  const ladder = defaults?.length ? defaults : [30, 15, 7, 3, 1];
  if (days <= (ladder[ladder.length - 1] ?? 1)) return "critical";
  if (days <= (ladder[Math.max(0, ladder.length - 3)] ?? 7)) return "warn";
  return "info";
}

function buildAlert(e: RegistryEntry, kind: ComplianceAlert["kind"], severity: AlertSeverity, why: string, dueDate?: string, eventKey?: string): ComplianceAlert {
  const suffix = eventKey ?? dueDate ?? "now";
  return {
    id: `${e.id}::${kind}::${suffix}`,
    entryId: e.id,
    kind,
    severity,
    title: `${e.code ? `${e.code} — ` : ""}${e.title}`,
    why,
    law: `${e.act}${e.section ? ` § ${e.section}` : ""}${e.rule ? ` · ${e.rule}` : ""}`,
    documents: [e.code, e.title].filter(Boolean) as string[],
    penalty: e.penalty,
    suggestedAction: e.aiInstructions
      || (e.kind === "form" ? `Generate ${e.code ?? e.title}`
        : e.kind === "register" ? `Update ${e.code ?? e.title}`
        : e.kind === "return" ? `File ${e.code ?? e.title}`
        : e.kind === "licence" ? `Renew ${e.title}`
        : `Review ${e.title}`),
    eventKey,
    dueDate,
    createdAt: new Date().toISOString(),
  };
}

// ── Public API ─────────────────────────────────────────────────────────────
export type EngineInput = {
  entries: RegistryEntry[];
  profile: ComplianceProfile;
  now?: Date;
};

/** Scan all entries → produce time + conditional alerts (event alerts come from the bus). */
export function scanRegistry({ entries, profile }: EngineInput): ComplianceAlert[] {
  const out: ComplianceAlert[] = [];
  for (const e of entries) {
    if (!e.enabled) continue;
    if (!isApplicable(e, profile)) continue;

    // Licence expiry
    if (e.expiryDate) {
      const d = daysUntil(e.expiryDate);
      if (d <= 60) out.push(buildAlert(e, "time", d <= 7 ? "critical" : d <= 30 ? "warn" : "info",
        `${e.kind === "licence" ? "Licence" : "Entry"} expires in ${d} day(s) on ${e.expiryDate}.`,
        e.expiryDate));
    }

    // Time-bound filings
    if (e.triggerKind === "time" || ["monthly", "quarterly", "half_yearly", "annual", "financial_year", "calendar_year", "biennial"].includes(e.frequency)) {
      const due = nextDueDate(e);
      if (due) {
        const d = daysUntil(due);
        const ladder = e.reminderDays?.length ? e.reminderDays : [30, 15, 7, 3, 1];
        if (d <= (ladder[0] ?? 30)) {
          out.push(buildAlert(e, "time", severityFor(d, ladder),
            `${e.title} is due in ${d} day(s) (${due}).`, due));
        }
      }
    }

    // Conditional (newly applicable) — only surface enabled + conditional entries with a min threshold recently crossed
    if (e.triggerKind === "conditional") {
      const min = e.applicability?.minEmployees;
      if (min != null && profile.employeeCount >= min && profile.employeeCount < min * 1.5) {
        out.push(buildAlert(e, "conditional", "info",
          `Company crossed ${min} employees — ${e.title} is now applicable.`));
      }
      if (e.applicability?.minWomen && profile.womenEmployees >= e.applicability.minWomen) {
        out.push(buildAlert(e, "conditional", "info",
          `${profile.womenEmployees} women employee(s) — ${e.title} now applies.`));
      }
    }
  }
  return out;
}

/** Given a fired event key, produce alerts for every registry entry bound to it. */
export function alertsForEvent(entries: RegistryEntry[], profile: ComplianceProfile, eventKey: string, subject?: string): ComplianceAlert[] {
  const out: ComplianceAlert[] = [];
  for (const e of entries) {
    if (!e.enabled) continue;
    if (e.triggerKind !== "event" || e.eventKey !== eventKey) continue;
    if (!isApplicable(e, profile)) continue;
    out.push(buildAlert(e, "event", "warn",
      `Event "${eventKey}"${subject ? ` for ${subject}` : ""} — action required per ${e.act}.`,
      undefined, eventKey));
  }
  return out;
}
