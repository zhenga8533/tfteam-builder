import { createFileRoute, Link, type LinkProps } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Hammer, Sparkles, Swords, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveSet, useGameData } from "@/lib/data/hooks";

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
  { title: "Champions", description: "Abilities, stats and traits for every unit.", to: "/champions", icon: Users },
  { title: "Traits", description: "Every breakpoint and what it unlocks.", to: "/traits", icon: Sparkles },
  { title: "Items", description: "Recipes, emblems, artifacts and radiants.", to: "/items", icon: Swords },
  { title: "Augments", description: "Silver, gold and prismatic augments.", to: "/augments", icon: BookOpen },
];

function HomePage() {
  const { version, set } = useActiveSet();
  const data = useGameData();

  return (
    <div className="space-y-12">
      <section className="flex flex-col items-start gap-6 py-8 sm:py-16">
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Patch {version} · Set {set}
        </span>
        <h1 className="max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-6xl">
          Plan your next <span className="text-primary">top four</span>.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Build boards, explore {data.champions.length} champions and {data.traits.length} traits, and follow the comps
          that are winning this patch.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/builder">
              Open Team Builder <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/tierlist/comps">View Tier List</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
