import { TraitCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { TraitIcon } from "@/components/game/icons";
import { TRAIT_TEXT } from "@/components/game/styles";
import { cn } from "@/lib/utils";
import { useBoardSummary } from "../use-builder";

export function TraitPanel({ className }: { className?: string }) {
  const { traits } = useBoardSummary();

  return (
    <section className={cn("space-y-2", className)} aria-labelledby="traits-heading">
      <h2 id="traits-heading" className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
        Traits
      </h2>
      {traits.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Add champions to see active traits.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
          {traits.map(({ trait, count, activeIndex, style, flex }) => (
            <li key={trait.apiName}>
              <GameHoverCard content={<TraitCard trait={trait} count={count} />} side="right">
                <div
                  tabIndex={0}
                  className={cn(
                    "flex items-center gap-2 rounded-md bg-linear-to-r from-black/45 to-black/15 py-1 pr-2 pl-1 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <TraitIcon trait={trait} style={style} className="size-9" />
                  <span
                    className={cn(
                      "min-w-6 rounded-sm bg-black/50 px-1 py-0.5 text-center text-sm font-bold tabular-nums",
                      style === "inactive" ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {count}
                    {flex > 0 && (
                      <span
                        className="text-[10px] font-medium text-muted-foreground"
                        title={`+${flex} from flex units`}
                      >
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
