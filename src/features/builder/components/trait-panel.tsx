import { ListOrdered } from "lucide-react";
import { useMemo, useState } from "react";
import { TraitCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { ChampionIcon, TraitIcon } from "@/components/game/icons";
import { TRAIT_TEXT } from "@/components/game/styles";
import { Toggle } from "@/components/ui/toggle";
import { useGameData } from "@/lib/data/hooks";
import { type LadderStep, traitLadder } from "@/lib/game/trait-planner";
import { cn } from "@/lib/utils";
import { useBoardSummary, useBuilder } from "../use-builder";

/** Champions shown per trait in the ladder; the first are the best additions for the whole board. */
const LADDER_CANDIDATES = 5;

type TraitEntry = ReturnType<typeof useBoardSummary>["traits"][number];

function TraitRow({ entry }: { entry: TraitEntry }) {
  const { trait, count, activeIndex, style, flex } = entry;
  return (
    <GameHoverCard content={<TraitCard trait={trait} count={count} />} side="right">
      <div
        tabIndex={0}
        className="flex items-center gap-2 rounded-md bg-linear-to-r from-trait-row-from to-trait-row-to py-1 pr-2 pl-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <TraitIcon trait={trait} style={style} className="size-9" />
        <span
          className={cn(
            "min-w-6 rounded-sm bg-trait-count px-1 py-0.5 text-center text-sm font-bold tabular-nums",
            style === "inactive" ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {count}
          {flex > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground" title={`+${flex} from flex units`}>
              +{flex}
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-semibold",
              style === "inactive" && "font-medium text-muted-foreground",
            )}
          >
            {trait.name}
          </p>
          {style === "inactive" ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {count} / {trait.breakpoints[0]?.minUnits}
            </p>
          ) : (
            <p className="flex gap-1 text-xs text-muted-foreground/70 tabular-nums">
              {trait.breakpoints.map((breakpoint, index) => (
                <span key={index} className={cn(index === activeIndex && ["font-bold", TRAIT_TEXT[style]])}>
                  {index > 0 && <span className="mr-1 text-muted-foreground/40">›</span>}
                  {breakpoint.minUnits}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </GameHoverCard>
  );
}

/** The next breakpoint for a trait and the champions that would get there; clicking one adds it. */
function LadderStepRow({ step }: { step: LadderStep }) {
  const { addPlaced } = useBuilder();
  const needed = step.next - step.count;
  return (
    <div className="flex items-center gap-2 px-1 pt-1 text-xs text-muted-foreground">
      <span className="shrink-0 tabular-nums" title={`${needed} more for ${step.next} ${step.trait.name}`}>
        +{needed} → {step.next}
      </span>
      <span className="flex flex-wrap gap-1">
        {step.candidates.slice(0, LADDER_CANDIDATES).map((champion) => (
          <button
            key={champion.apiName}
            type="button"
            onClick={() => addPlaced(champion.apiName)}
            title={`Add ${champion.name}`}
            aria-label={`Add ${champion.name}`}
            className="rounded-md outline-none hover:brightness-125 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChampionIcon champion={champion} className="size-6 ring-1" />
          </button>
        ))}
      </span>
    </div>
  );
}

export function TraitPanel({ className }: { className?: string }) {
  const data = useGameData();
  const { units, traits } = useBoardSummary();
  const [showLadder, setShowLadder] = useState(false);
  const ladder = useMemo(() => {
    if (!showLadder) return new Map<string, LadderStep>();
    const core = units.filter((unit) => !unit.flex);
    return new Map(traitLadder(core, data).map((step) => [step.trait.apiName, step]));
  }, [showLadder, units, data]);

  return (
    <section className={cn("space-y-2", className)} aria-labelledby="traits-heading">
      <div className="flex items-center justify-between gap-2">
        <h2 id="traits-heading" className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          Traits
        </h2>
        <Toggle
          size="sm"
          pressed={showLadder}
          onPressedChange={setShowLadder}
          disabled={traits.length === 0}
          className="h-7 gap-1 px-2 text-xs"
          title="Show what each trait needs for its next breakpoint"
        >
          <ListOrdered /> Ladder
        </Toggle>
      </div>
      {traits.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Add champions to see active traits.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
          {traits.map((entry) => {
            const step = ladder.get(entry.trait.apiName);
            return (
              <li key={entry.trait.apiName}>
                <TraitRow entry={entry} />
                {step && step.candidates.length > 0 && <LadderStepRow step={step} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
