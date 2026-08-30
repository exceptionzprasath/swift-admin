import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon";

export const Route = createFileRoute("/admin/compliance-docs")({
  head: () => ({ meta: [{ title: "Compliance Documents · SWIFT AI" }] }),
  component: ComplianceDocsPage,
});

function ComplianceDocsPage() {
  return (
    <ComingSoonPage
      title="Compliance Docs"
      category="Statutory Registers & Returns"
      icon={ShieldCheck}
      description="Automated statutory registers, government return forms (Form A-E), and digital signature-sealed compliance documents."
      estimatedRelease="Coming Soon"
    />
  );
}
