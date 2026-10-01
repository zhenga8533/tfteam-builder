import { TraitIcon } from "@/components/game/icons";
import { useGameData, useStats } from "@/lib/data/hooks";
import type { Champion } from "@/lib/data/schema";
import { cn } from "@/lib/utils";
import { count, percent } from "../format";
import { AvgPlacement } from "./stat-summary";

/** A champion's alternate forms (e.g. Lux's elemental forms), with per-form stats when available. */
export function ChampionForms({ champion, className }: { champion: Champion; className?: string }) {
  const { traitsByApi } = useGameData();
  const stats = useStats();
  if (champion.forms.length === 0) return null;

  const forms = [...champion.forms].sort(
    (a, b) => (stats?.forms[a.apiName]?.score ?? Infinity) - (stats?.forms[b.apiName]?.score ?? Infinity),
  );

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Forms</p>
      <ul className="space-y-1.5">
        {forms.map((form) => {
          const line = stats?.forms[form.apiName];
          return (
            <li key={form.apiName} className="flex items-center gap-2 text-sm">
              <img src={form.icon} alt="" loading="lazy" className="size-7 rounded-md bg-muted object-cover" />
              <span className="min-w-0 flex-1 truncate">{form.label ?? form.name}</span>
              <span className="flex gap-0.5">
                {form.traits.map((apiName) => {
                  const trait = traitsByApi.get(apiName);
                  return trait ? <TraitIcon key={apiName} trait={trait} className="size-4" /> : null;
                })}
              </span>
              {line && (
                <span className="w-28 text-right text-xs text-muted-foreground" title={`${count(line.games)} games`}>
                  <AvgPlacement line={line} /> · {percent(line.top4)} top 4
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
