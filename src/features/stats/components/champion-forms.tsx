import { Link } from "@tanstack/react-router";
import { ChampionIcon, TraitIcon } from "@/components/game/icons";
import { useGameData, useStats } from "@/lib/data/hooks";
import type { Champion } from "@/lib/data/schema";
import { otherForms } from "@/lib/game/forms";
import { cn } from "@/lib/utils";
import { AvgPlacement } from "./stat-summary";

/** Links to a champion's other forms (e.g. Lux's elemental forms), best first when stats are available. */
export function ChampionForms({
  champion,
  title,
  className,
}: {
  champion: Champion;
  title?: string;
  className?: string;
}) {
  const { champions, traitsByApi } = useGameData();
  const stats = useStats();
  const forms = otherForms(champion, champions).sort(
    (a, b) => (stats?.units[a.apiName]?.score ?? Infinity) - (stats?.units[b.apiName]?.score ?? Infinity),
  );
  if (forms.length === 0) return null;

  return (
    <div className={cn("space-y-1.5", className)}>
      {title && <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</p>}
      <ul className="space-y-1">
        {forms.map((form) => {
          const line = stats?.units[form.apiName];
          return (
            <li key={form.apiName}>
              <Link
                to="/champions/$apiName"
                params={{ apiName: form.apiName }}
                className="flex items-center gap-2 rounded-md p-1 text-sm hover:bg-accent"
              >
                <ChampionIcon champion={form} className="size-7" />
                <span className="min-w-0 flex-1 truncate">{form.name}</span>
                <span className="flex gap-0.5">
                  {form.traits.map((apiName) => {
                    const trait = traitsByApi.get(apiName);
                    return trait ? <TraitIcon key={apiName} trait={trait} className="size-4" /> : null;
                  })}
                </span>
                {line && <AvgPlacement line={line} className="w-10 text-right text-xs" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
