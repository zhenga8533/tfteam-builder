import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/tierlist/augments")({
  head: () => ({ meta: [{ title: "Augment Tier List · TFTeam Builder" }] }),
  component: AugmentTierListPage,
});

function AugmentTierListPage() {
  return <ComingSoon title="Augment Tier List" />;
}
