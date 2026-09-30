import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/comps/$slug")({
  head: () => ({ meta: [{ title: "Comp Guide · TFTeam Builder" }] }),
  component: CompGuidePage,
});

function CompGuidePage() {
  return <ComingSoon title="Comp Guide" />;
}
