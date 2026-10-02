import { ChevronDown, WandSparkles } from "lucide-react";
import { useState } from "react";
import { EntityPicker } from "@/components/game/entity-picker";
import { ChampionIcon, TraitIcon } from "@/components/game/icons";
import { COST_TEXT, COSTS } from "@/components/game/styles";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGameData } from "@/lib/data/hooks";
import type { Champion } from "@/lib/data/schema";
import { type AutofillGoal, defaultMaxCost } from "@/lib/game/trait-planner";
import { computeTraits, traitStyle } from "@/lib/game/traits";
import { cn } from "@/lib/utils";
import { useAutofill } from "../use-autofill";
import { useBuilder } from "../use-builder";

const MODES: Record<AutofillGoal["mode"], { title: string; hint: string }> = {
  most: { title: "Most traits", hint: "As many different traits as possible" },
  levels: { title: "Highest levels", hint: "Deeper breakpoints: one gold beats three bronze" },
};

/** Traits shown per suggestion; the rest are in the board's trait panel once added. */
const SHOWN_TRAITS = 6;

/** The traits the board would have with `champions` added, breakpoint traits first. */
function useResultingTraits(champions: Champion[]) {
  const { championsByApi, traitsByApi, itemsByApi } = useGameData();
  const { board } = useBuilder();
  const units = [
    ...board.flatMap((unit) => (unit && !unit.flex ? [unit] : [])),
    ...champions.map((champion) => ({ apiName: champion.apiName, items: [] })),
  ];
  const active = computeTraits(units, championsByApi, traitsByApi, itemsByApi).filter(
    (state) => state.style !== "inactive",
  );
  return [...active.filter((state) => state.style !== "unique"), ...active.filter((state) => state.style === "unique")];
}

function Suggestion({ index, champions, onAdd }: { index: number; champions: Champion[]; onAdd: () => void }) {
  const traits = useResultingTraits(champions);
  return (
    <li className="space-y-1.5 rounded-md border p-2">
      <div className="flex items-center gap-2">
        <span className="w-4 text-center text-xs font-semibold text-muted-foreground">{index + 1}</span>
        <span className="flex min-w-0 flex-1 flex-wrap gap-1">
          {champions.map((champion) => (
            <ChampionIcon key={champion.apiName} champion={champion} className="size-8" title={champion.name} />
          ))}
        </span>
        <Button size="sm" onClick={onAdd}>
          Add
        </Button>
      </div>
      <p className="flex flex-wrap gap-x-2 gap-y-1 pl-6 text-xs">
        {traits.slice(0, SHOWN_TRAITS).map(({ trait, count, style }) => (
          <span key={trait.apiName} className="inline-flex items-center gap-0.5" title={`${count} ${trait.name}`}>
            <TraitIcon trait={trait} style={style} className="size-4" />
            {style !== "unique" && <span className="font-semibold tabular-nums">{count}</span>}
          </span>
        ))}
        {traits.length > SHOWN_TRAITS && <span className="text-muted-foreground">+{traits.length - SHOWN_TRAITS}</span>}
      </p>
    </li>
  );
}

function AutofillPanel({ onDone }: { onDone: () => void }) {
  const { traits, traitsByApi } = useGameData();
  const { goal, setGoal, level, openSlots, maxCost, suggestions, apply } = useAutofill(true);

  if (openSlots === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Level {level} is full. Raise the level or remove a unit to autofill.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        Fill level {level} · {openSlots} open {openSlots === 1 ? "slot" : "slots"}
      </p>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Goal</p>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={goal.mode}
          onValueChange={(mode) => mode && setGoal({ ...goal, mode: mode as AutofillGoal["mode"] })}
          className="w-full"
        >
          {Object.entries(MODES).map(([mode, { title, hint }]) => (
            <ToggleGroupItem key={mode} value={mode} title={hint} className="flex-1">
              {title}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Build around</p>
        <EntityPicker
          options={traits
            .filter((trait) => trait.source === "champion" && trait.breakpoints.length > 1)
            .map((trait) => ({
              key: trait.apiName,
              label: trait.name,
              icon: <TraitIcon trait={trait} style={traitStyle(trait.breakpoints.at(-1)?.style ?? 1)} />,
            }))}
          value={goal.around && traitsByApi.has(goal.around) ? goal.around : undefined}
          onChange={(around) => setGoal({ ...goal, around })}
          placeholder="Any trait"
          label="Build around a trait"
          className="w-full"
        />
      </div>
      <div className="space-y-1">
        <p className="flex justify-between text-xs text-muted-foreground">
          <span>Costs up to</span>
          {goal.maxCost === undefined ? (
            <span>Set by level</span>
          ) : (
            <button
              type="button"
              className="underline-offset-2 hover:underline"
              onClick={() => setGoal({ ...goal, maxCost: undefined })}
            >
              Reset to {defaultMaxCost(level)} for level {level}
            </button>
          )}
        </p>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={String(maxCost)}
          onValueChange={(value) => value && setGoal({ ...goal, maxCost: Number(value) })}
          className="w-full"
          aria-label="Most expensive champion to add"
        >
          {COSTS.map((cost) => (
            <ToggleGroupItem key={cost} value={String(cost)} className={cn("flex-1 font-semibold", COST_TEXT[cost])}>
              {cost}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {suggestions.length === 0 ? (
        <p className="py-2 text-center text-sm text-muted-foreground">No champions left to add within these costs.</p>
      ) : (
        <ol className="space-y-2" aria-label="Suggestions">
          {suggestions.map((champions, index) => (
            <Suggestion
              key={champions.map((champion) => champion.apiName).join("|")}
              index={index}
              champions={champions}
              onAdd={() => {
                apply(champions);
                onDone();
              }}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * Autofill: the button adds the best suggestion for the saved settings; the arrow opens a panel to
 * change the goal, trait and costs, preview the top boards and add one.
 */
export function AutofillButton() {
  const [open, setOpen] = useState(false);
  const { traitsByApi } = useGameData();
  const { goal, level, openSlots, best, apply } = useAutofill(false);
  const around = goal.around ? traitsByApi.get(goal.around) : undefined;

  return (
    <div className="flex">
      <Button
        variant="outline"
        size="sm"
        onClick={() => apply(best())}
        disabled={openSlots === 0}
        className="rounded-r-none border-r-0"
        title={openSlots === 0 ? `Level ${level} is full` : `Fill the ${openSlots} open slots for level ${level}`}
      >
        <WandSparkles /> Autofill
        <span className="text-xs text-muted-foreground max-sm:hidden">
          · {around ? around.name : MODES[goal.mode].title}
        </span>
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-l-none px-1.5" aria-label="Autofill options">
            <ChevronDown className="opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)]">
          <AutofillPanel onDone={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
