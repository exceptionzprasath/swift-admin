import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Bot } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon";

export const Route = createFileRoute("/admin/ai")({
  head: () => ({ meta: [{ title: "SWIFT AI · Copilot" }] }),
  component: AiDashboard,
});

function AiDashboard() {
  return (
    <ComingSoonPage
      title="SWIFT AI Copilot"
      category="Conversational HR Intelligence"
      icon={Bot}
      description="Ask questions, generate policies, automate payroll summaries, and query compliance guidelines with enterprise AI trained on your organization's data."
      estimatedRelease="Coming Soon"
    />
  );
}
