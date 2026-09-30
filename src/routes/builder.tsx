import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page-header";
import { Builder } from "@/features/builder/components/builder";

export const Route = createFileRoute("/builder")({
  head: () => ({ meta: [{ title: "Team Builder · TFTeam Builder" }] }),
  component: BuilderPage,
});

function BuilderPage() {
  return (
    <>
      <PageHeader
        title="Team Builder"
        description="Drag champions onto the board, equip items, and watch your traits update."
      />
      <Builder />
    </>
  );
}
