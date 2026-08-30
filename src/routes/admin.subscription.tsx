import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon";

export const Route = createFileRoute("/admin/subscription")({
  head: () => ({ meta: [{ title: "Subscription · SWIFT AI" }] }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  return (
    <ComingSoonPage
      title="Subscription & Plans"
      category="Billing & Quotas"
      icon={CreditCard}
      description="Self-service subscription upgrades, payment gateway integration, usage quotas, and automated GST tax invoices."
      estimatedRelease="Coming Soon"
    />
  );
}
