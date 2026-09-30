import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/builder")({
  head: () => ({ meta: [{ title: "Team Builder · TFTeam Builder" }] }),
  component: BuilderPage,
});

function BuilderPage() {
  return <ComingSoon title="Team Builder" />;
}
