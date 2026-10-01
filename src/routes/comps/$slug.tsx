import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Hammer } from "lucide-react";
import { AugmentCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { AugmentIcon } from "@/components/game/icons";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { findComp } from "@/content";
import { DEFAULT_LEVEL, EARLY_LEVEL } from "@/features/builder/store";
import { CompBoard } from "@/features/comps/components/comp-board";
import { Carries, CompTraits, Section } from "@/features/comps/components/comp-sections";
import { SetGuard } from "@/features/comps/components/set-guard";
import { TierBadge, TrendBadge } from "@/features/comps/components/tier-badge";
import { DIFFICULTY_TEXT } from "@/features/comps/styles";
import { useCompSignature } from "@/features/comps/use-comp-signature";
import { useOpenInBuilder } from "@/features/comps/use-open-in-builder";
import { StatSummary } from "@/features/stats/components/stat-summary";
import type { CompUnit } from "@/content/types";
import { useAutoComps, useGameData } from "@/lib/data/hooks";

export const Route = createFileRoute("/comps/$slug")({
  loader: ({ params }) => {
    const comp = findComp(params.slug);
    if (!comp) throw notFound();
    return comp;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: `${loaderData.name} · TFTeam Builder` }, { name: "description", content: loaderData.summary }]
      : [],
  }),
  component: CompGuidePage,
});

function Augments({ apiNames }: { apiNames: string[] }) {
  const { augmentsByApi } = useGameData();
  return (
    <ul className="space-y-2">
      {apiNames.map((apiName) => {
        const augment = augmentsByApi.get(apiName);
        if (!augment) return null;
        return (
          <li key={apiName}>
            <GameHoverCard content={<AugmentCard augment={augment} />} side="left">
              <span tabIndex={0} className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2">
                <AugmentIcon augment={augment} className="size-8" />
                <span className="text-sm">{augment.name}</span>
              </span>
            </GameHoverCard>
          </li>
        );
      })}
    </ul>
  );
}

/** Stats for the detected comp whose carries and core traits match this guide's board, if any. */
function LiveStats({ units }: { units: CompUnit[] }) {
  const signature = useCompSignature(units);
  const match = useAutoComps()?.find((comp) => comp.signature === signature);
  if (!match) return null;
  return (
    <Link
      to="/comps/auto/$id"
      params={{ id: match.id }}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-card px-3 py-2 text-sm hover:border-primary/50"
    >
      <span className="font-medium">Live stats</span>
      <StatSummary line={match} />
      <span className="text-xs text-muted-foreground">as &ldquo;{match.name}&rdquo; →</span>
    </Link>
  );
}

function CompGuidePage() {
  const comp = Route.useLoaderData();
  const openInBuilder = useOpenInBuilder();

  return (
    <div className="space-y-6">
      <Link
        to="/tierlist/comps"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Comp Tier List
      </Link>

      <header className="flex flex-wrap items-start gap-4">
        <TierBadge tier={comp.tier} className="size-14 text-3xl" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-bold tracking-tight">{comp.name}</h1>
            {comp.trend && <TrendBadge trend={comp.trend} />}
          </div>
          <p className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
            <span>{comp.playstyle}</span>
            <span className={DIFFICULTY_TEXT[comp.difficulty]}>{comp.difficulty}</span>
            <span>Set {comp.set}</span>
            <span>Updated {comp.updatedAt}</span>
          </p>
        </div>
        <Button
          onClick={() =>
            openInBuilder(
              comp.set,
              [
                ...(comp.early ? [{ level: EARLY_LEVEL, units: comp.early }] : []),
                { level: DEFAULT_LEVEL, units: comp.board },
              ],
              comp.name,
            )
          }
        >
          <Hammer /> Open in Team Builder
        </Button>
      </header>

      <p className="max-w-3xl text-muted-foreground">{comp.summary}</p>
      <SetGuard set={comp.set} fallback={null}>
        <LiveStats units={comp.board} />
      </SetGuard>

      <SetGuard set={comp.set}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <Tabs defaultValue="final">
              {comp.early && (
                <TabsList>
                  <TabsTrigger value="final">Final board</TabsTrigger>
                  <TabsTrigger value="early">Early game</TabsTrigger>
                </TabsList>
              )}
              <TabsContent value="final" className="pt-3">
                <CompBoard units={comp.board} className="max-w-2xl" />
              </TabsContent>
              {comp.early && (
                <TabsContent value="early" className="pt-3">
                  <CompBoard units={comp.early} className="max-w-2xl" />
                </TabsContent>
              )}
            </Tabs>
            {comp.tips && comp.tips.length > 0 && (
              <Section title="Tips">
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground marker:text-primary">
                  {comp.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
          <aside className="space-y-4">
            <Section title="Traits">
              <CompTraits units={comp.board} />
            </Section>
            <Section title="Carries & items">
              <Carries units={comp.board} />
            </Section>
            {comp.augments && comp.augments.length > 0 && (
              <Section title="Augments">
                <Augments apiNames={comp.augments} />
              </Section>
            )}
          </aside>
        </div>
      </SetGuard>
    </div>
  );
}
