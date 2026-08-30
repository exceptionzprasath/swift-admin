import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Log · SWIFT AI" }] }),
  component: AuditPage,
});

function AuditPage() {
  return (
    <ComingSoonPage
      title="Audit Log"
      category="Security & Audit Trail"
      icon={ShieldCheck}
      description="Track every registration, update, approval, and security action with an immutable enterprise audit trail."
      estimatedRelease="Coming Soon"
    />
  );
}
