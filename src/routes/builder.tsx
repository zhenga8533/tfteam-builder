import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page-header";
import { Builder } from "@/features/builder/components/builder";
import { useSharedTeam } from "@/features/builder/use-shared-team";
import { stringParam } from "@/lib/search";

export const Route = createFileRoute("/builder")({
  head: () => ({ meta: [{ title: "Team Builder · TFTeam" }] }),
  /** `team` is a share link's team; `guide` is a detected comp to start a guide from. */
  validateSearch: (search: Record<string, unknown>): { team?: string; guide?: string } => ({
    team: stringParam(search.team),
    guide: stringParam(search.guide),
  }),
  component: BuilderPage,
});

function BuilderPage() {
  useSharedTeam(Route.useSearch().team);
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
