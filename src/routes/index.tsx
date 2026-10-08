import { createFileRoute, Link, type LinkProps } from "@tanstack/react-router";
import { ArrowRight, BarChart3, BookOpen, Compass, Hammer, Sparkles, Swords, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AutoCompCard } from "@/features/comps/components/comp-card";
import { MIN_TREND } from "@/features/stats/format";
import { useActiveSet, useAutoComps, useGameData, useSetPatch } from "@/lib/data/hooks";

/** Detected comps previewed on the home page. */
const FEATURED_COMPS = 4;

/** Comps whose average placement improved the most since the previous patch. */
function RisingComps() {
  const comps = (useAutoComps() ?? [])
    .filter((comp) => comp.trend !== undefined && comp.trend <= -MIN_TREND)
    .sort((a, b) => a.trend! - b.trend!)
    .slice(0, FEATURED_COMPS);
  if (comps.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold">Rising this patch</h2>
      <div className="grid gap-2 xl:grid-cols-2">
        {comps.map((comp) => (
          <AutoCompCard key={comp.id} comp={comp} />
        ))}
      </div>
    </section>
  );
}

function TopComps() {
  const comps = (useAutoComps() ?? []).slice(0, FEATURED_COMPS);
  if (comps.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-semibold">Strongest comps right now</h2>
        <Link
          to="/tierlist/comps"
          className="shrink-0 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground"
        >
          All comps <ArrowRight className="inline size-4" />
        </Link>
      </div>
      <div className="grid gap-2 xl:grid-cols-2">
        {comps.map((comp) => (
          <AutoCompCard key={comp.id} comp={comp} />
        ))}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});

interface Feature {
  title: string;
  description: string;
  to: LinkProps["to"];
  icon: LucideIcon;
}

const FEATURES: Feature[] = [
  {
    title: "Comp Tier List",
    description: "Ranked comps with boards, items and augments.",
    to: "/tierlist/comps",
    icon: Trophy,
  },
  {
    title: "Team Builder",
    description: "Drag units onto the board and track traits live.",
    to: "/builder",
    icon: Hammer,
  },
  {
    title: "Champion Tier List",
    description: "Units, items and traits ranked by placement.",
    to: "/tierlist/champions",
    icon: BarChart3,
  },
  {
    title: "Explorer",
    description: "Filter ranked boards and see what wins with them.",
    to: "/explorer",
    icon: Compass,
  },
  { title: "Champions", description: "Abilities, stats and traits for every unit.", to: "/champions", icon: Users },
  { title: "Traits", description: "Every breakpoint and what it unlocks.", to: "/traits", icon: Sparkles },
  { title: "Items", description: "Recipes, emblems, artifacts and radiants.", to: "/items", icon: Swords },
  { title: "Augments", description: "Silver, gold and prismatic augments.", to: "/augments", icon: BookOpen },
];

function HomePage() {
  const { set } = useActiveSet();
  const { label } = useSetPatch();
  const data = useGameData();
  // Forms such as Lux (Coven) and set-mechanic traits aren't separate things to explore.
  const shopChampions = data.champions.filter((champion) => !champion.formOf).length;
  const championTraits = data.traits.filter((trait) => trait.source === "champion").length;

  return (
    <div className="space-y-12">
      <section className="flex flex-col items-start gap-6 py-8 sm:py-16">
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Set {set}
          {label && ` · Patch ${label}`}
        </span>
        <h1 className="max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-6xl">
          Plan your next <span className="text-primary">top four</span>.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Build boards, explore {shopChampions} champions and {championTraits} traits, and follow the comps that are
          winning this patch.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/builder">
              Open Team Builder <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/tierlist/comps">View Tier List</Link>
          </Button>
        </div>
      </section>

      <TopComps />
      <RisingComps />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ title, description, to, icon: Icon }) => (
          <Link key={title} to={to} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-accent/40">
              <CardHeader>
                <Icon className="mb-2 size-6 text-primary" />
                <CardTitle className="font-display">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
