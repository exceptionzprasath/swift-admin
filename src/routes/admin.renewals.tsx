import { createFileRoute } from "@tanstack/react-router";
import { BellRing } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon";

export const Route = createFileRoute("/admin/renewals")({
  head: () => ({ meta: [{ title: "Renewal Scheduler · SWIFT AI" }] }),
  component: RenewalsPage,
});

function RenewalsPage() {
  return (
    <ComingSoonPage
      title="Renewal Scheduler"
      category="Automated Alerts & Grace Period"
      icon={BellRing}
      description="Automated pre-expiry alerts via WhatsApp, SMS, and Email with configurable grace periods to ensure uninterrupted service."
      estimatedRelease="Coming Soon"
    />
  );
}
