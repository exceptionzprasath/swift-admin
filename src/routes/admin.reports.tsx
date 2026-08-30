import { createFileRoute } from "@tanstack/react-router";
import { FileDown, BarChart3 } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Reports & Analytics · SWIFT" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <ComingSoonPage
      title="Reports & Analytics"
      category="Payroll & Workforce Intelligence"
      icon={BarChart3}
      description="Generate comprehensive statutory EPF/ESI/PT statements, salary registers, bank transfer batches, variance analysis, and audit trails."
      estimatedRelease="Coming Soon"
    />
  );
}
