import { createFileRoute } from "@tanstack/react-router";
import { Package, Boxes } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon";

export const Route = createFileRoute("/admin/assets")({
  head: () => ({ meta: [{ title: "Asset Management · SWIFT" }] }),
  component: AssetsPage,
});

function AssetsPage() {
  return (
    <ComingSoonPage
      title="Asset Management"
      category="Inventory & Digital Handovers"
      icon={Package}
      description="Manage company hardware, devices, software licenses, allocation handovers with digital e-signatures, and lifecycle maintenance tracking."
      estimatedRelease="Coming Soon"
    />
  );
}
