import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/traits")({
  head: () => ({ meta: [{ title: "Traits · TFTeam Builder" }] }),
  component: TraitsPage,
});

function TraitsPage() {
  return <ComingSoon title="Traits" />;
}
