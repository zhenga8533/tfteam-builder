import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/augments")({
  head: () => ({ meta: [{ title: "Augments · TFTeam Builder" }] }),
  component: AugmentsPage,
});

function AugmentsPage() {
  return <ComingSoon title="Augments" />;
}
