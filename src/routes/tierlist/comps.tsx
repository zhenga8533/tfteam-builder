import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/tierlist/comps")({
  head: () => ({ meta: [{ title: "Comp Tier List · TFTeam Builder" }] }),
  component: CompTierListPage,
});

function CompTierListPage() {
  return <ComingSoon title="Comp Tier List" />;
}
