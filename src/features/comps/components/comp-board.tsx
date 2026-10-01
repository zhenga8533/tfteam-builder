import { ChampionCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { EmptyHex, HexGrid, HexUnit } from "@/components/game/hex-grid";
import type { CompUnit } from "@/content/types";
import { useGameData } from "@/lib/data/hooks";

/** Read-only board for a comp; units missing from the active data are skipped. */
export function CompBoard({ units, className }: { units: CompUnit[]; className?: string }) {
  const { championsByApi, itemsByApi } = useGameData();
  const byHex = new Map(units.map((unit) => [unit.hex, unit]));

  return (
    <HexGrid
      className={className}
      renderCell={(index) => {
        const unit = byHex.get(index);
        const champion = unit && championsByApi.get(unit.apiName);
        return (
          <div key={index} className="hex-cell">
            <EmptyHex />
            {unit && champion && (
              <GameHoverCard content={<ChampionCard champion={champion} star={unit.star} />}>
                <span tabIndex={0} className="absolute inset-0 outline-none" aria-label={champion.name}>
                  <HexUnit
                    champion={champion}
                    star={unit.star ?? 1}
                    items={(unit.items ?? []).flatMap((apiName) => itemsByApi.get(apiName) ?? [])}
                    flex={unit.flex}
                    alternatives={unit.alternatives?.flatMap((apiName) => championsByApi.get(apiName) ?? [])}
                  />
                </span>
              </GameHoverCard>
            )}
          </div>
        );
      }}
    />
  );
}
