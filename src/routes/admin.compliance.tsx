import { createFileRoute } from "@tanstack/react-router";
import { Scale } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon";

export const Route = createFileRoute("/admin/compliance")({
  head: () => ({ meta: [{ title: "Compliance AI · SWIFT AI" }] }),
  component: CompliancePage,
});

function CompliancePage() {
  return (
    <ComingSoonPage
      title="Compliance AI"
      category="Labor Law & Regulatory Copilot"
      icon={Scale}
      description="Autonomous labor law compliance intelligence, state-specific statutory rule verification, and predictive filing deadline tracking."
      estimatedRelease="Coming Soon"
    />
  );
}
