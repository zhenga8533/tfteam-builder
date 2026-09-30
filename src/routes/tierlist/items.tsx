import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/tierlist/items")({
  head: () => ({ meta: [{ title: "Item Tier List · TFTeam Builder" }] }),
  component: ItemTierListPage,
});

function ItemTierListPage() {
  return <ComingSoon title="Item Tier List" />;
}
