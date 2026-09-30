import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/champions")({
  head: () => ({ meta: [{ title: "Champions · TFTeam Builder" }] }),
  component: ChampionsPage,
});

function ChampionsPage() {
  return <ComingSoon title="Champions" />;
}
