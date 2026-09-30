import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Hammer } from "lucide-react";
import { AugmentCard, ItemCard, TraitCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { AugmentIcon, ChampionIcon, ItemIcon, TraitIcon } from "@/components/game/icons";
import { TRAIT_TEXT } from "@/components/game/styles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { findComp } from "@/content";
import type { Comp } from "@/content/types";
import { CompBoard } from "@/features/comps/components/comp-board";
import { SetGuard } from "@/features/comps/components/set-guard";
import { TierBadge, TrendBadge } from "@/features/comps/components/tier-badge";
import { DIFFICULTY_TEXT } from "@/features/comps/styles";
import { useCompTraits } from "@/features/comps/use-comp-traits";
import { useOpenInBuilder } from "@/features/comps/use-open-in-builder";
import { useGameData } from "@/lib/data/hooks";
import { cn } from "@/lib/utils";

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

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("gap-3 py-4", className)}>
      <CardHeader className="px-4">
        <CardTitle className="font-display">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  );
}

function CompTraits({ comp }: { comp: Comp }) {
  const traits = useCompTraits(comp.board);
  return (
    <ul className="space-y-1.5">
      {traits.map(({ trait, count, style }) => (
        <li key={trait.apiName}>
          <GameHoverCard content={<TraitCard trait={trait} count={count} />} side="left">
            <span tabIndex={0} className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2">
              <TraitIcon trait={trait} style={style} />
              <span className="flex-1 text-sm">{trait.name}</span>
              <span className={cn("text-sm font-semibold tabular-nums", TRAIT_TEXT[style])}>{count}</span>
            </span>
          </GameHoverCard>
        </li>
      ))}
    </ul>
  );
}

function Carries({ comp }: { comp: Comp }) {
  const { championsByApi, itemsByApi } = useGameData();
  const carries = comp.board.filter((unit) => unit.carry || (unit.items?.length ?? 0) > 0);
  return (
    <ul className="space-y-2">
      {carries.map((unit) => {
        const champion = championsByApi.get(unit.apiName);
        if (!champion) return null;
        return (
          <li key={unit.hex} className="flex items-center gap-3">
            <ChampionIcon champion={champion} className={cn("size-10", unit.carry && "ring-primary")} />
            <span className="flex-1 truncate text-sm font-medium">{champion.name}</span>
            <span className="flex gap-1">
              {(unit.items ?? []).map((apiName, index) => {
                const item = itemsByApi.get(apiName);
                return item ? (
                  <GameHoverCard key={index} content={<ItemCard item={item} />} side="left">
                    <span tabIndex={0} className="rounded-sm outline-none focus-visible:ring-2">
                      <ItemIcon item={item} className="size-8" />
                    </span>
                  </GameHoverCard>
                ) : null;
              })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

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
        <Button onClick={() => openInBuilder(comp)}>
          <Hammer /> Open in Team Builder
        </Button>
      </header>

      <p className="max-w-3xl text-muted-foreground">{comp.summary}</p>

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
              <CompTraits comp={comp} />
            </Section>
            <Section title="Carries & items">
              <Carries comp={comp} />
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
