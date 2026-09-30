import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/items")({
  head: () => ({ meta: [{ title: "Items · TFTeam Builder" }] }),
  component: ItemsPage,
});

function ItemsPage() {
  return <ComingSoon title="Items" />;
}
