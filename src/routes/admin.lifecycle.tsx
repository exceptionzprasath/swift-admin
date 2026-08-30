import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, GitBranch } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon";

export const Route = createFileRoute("/admin/lifecycle")({
  head: () => ({ meta: [{ title: "AI Lifecycle · SWIFT" }] }),
  component: LifecyclePage,
});

function LifecyclePage() {
  return (
    <ComingSoonPage
      title="AI Employee Lifecycle"
      category="Onboarding & Career Journeys"
      icon={GitBranch}
      description="Automate recruitment pipelines, onboarding workflows, probation reviews, document issuance, and exit clearances with intelligent AI copilots."
      estimatedRelease="Coming Soon"
    />
  );
}
