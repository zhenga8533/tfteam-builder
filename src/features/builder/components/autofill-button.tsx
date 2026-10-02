import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, WandSparkles, X } from "lucide-react";
import { toast } from "sonner";
import { TraitIcon } from "@/components/game/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveSet, useGameData } from "@/lib/data/hooks";
import { statsQuery } from "@/lib/data/queries";
import type { Champion } from "@/lib/data/schema";
import type { AutofillGoal } from "@/lib/game/trait-planner";
import { traitStyle } from "@/lib/game/traits";
import { useBuilderStore } from "../store";
import { useBoardSummary, useBuilder } from "../use-builder";

const MODES: Record<AutofillGoal["mode"], { title: string; hint: string }> = {
  most: { title: "Most traits", hint: "Activate as many different traits as possible" },
  levels: { title: "Highest trait levels", hint: "Go deeper: one gold trait beats three bronze" },
};

/** Autofill with the last chosen goal; the menu picks a mode or a trait to build around. */
export function AutofillButton() {
  const { set, board, level, setBoard, autofill } = useBuilder();
  const { units } = useBoardSummary();
  const { traits, traitsByApi } = useGameData();
  const { patch } = useActiveSet();
  // Not suspending: autofill works without stats, it just breaks ties by cost instead of placement.
  const stats = useQuery(statsQuery(patch, set)).data;
  const goal = useBuilderStore((state) => state.autofillGoal);
  const setGoal = useBuilderStore((state) => state.setAutofillGoal);
  const around = goal.around ? traitsByApi.get(goal.around) : undefined;
  const full = units.filter((unit) => !unit.flex).length >= level;

  const fill = (next: AutofillGoal) => {
    setGoal(next);
    const previous = board;
    const strength = stats
      ? (champion: Champion) => {
          const line = stats.units[champion.apiName];
          return line ? 4.5 - line.score : 0;
        }
      : undefined;
    const added = autofill(next, strength);
    if (added.length === 0) return;
    toast(`Added ${added.map((champion) => champion.name).join(", ")}.`, {
      action: { label: "Undo", onClick: () => setBoard(previous) },
    });
  };

  return (
    <div className="flex">
      <Button
        variant="outline"
        size="sm"
        onClick={() => fill(goal)}
        disabled={full}
        className="rounded-r-none border-r-0"
        title={`Fill to level ${level}: ${around ? `around ${around.name}, then ` : ""}${MODES[goal.mode].title.toLowerCase()}`}
      >
        <WandSparkles /> Autofill
        <span className="text-xs text-muted-foreground max-sm:hidden">
          · {around ? around.name : MODES[goal.mode].title}
        </span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-l-none px-1.5" aria-label="Autofill options">
            <ChevronDown className="opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Fill to level {level} for…</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={goal.mode}
            onValueChange={(mode) => fill({ ...goal, mode: mode as AutofillGoal["mode"] })}
          >
            {Object.entries(MODES).map(([mode, { title, hint }]) => (
              <DropdownMenuRadioItem key={mode} value={mode} disabled={full}>
                <span className="flex flex-col">
                  <span>{title}</span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={full}>
              {around ? `Build around ${around.name}` : "Build around a trait"}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-80 w-56 overflow-y-auto">
              {traits
                .filter((trait) => trait.source === "champion" && trait.breakpoints.length > 1)
                .map((trait) => (
                  <DropdownMenuItem key={trait.apiName} onSelect={() => fill({ ...goal, around: trait.apiName })}>
                    <TraitIcon
                      trait={trait}
                      style={traitStyle(trait.breakpoints.at(-1)?.style ?? 1)}
                      className="size-5"
                    />
                    <span className="flex-1">{trait.name}</span>
                    {trait.apiName === goal.around && <Check className="size-4" />}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {around && (
            <DropdownMenuItem onSelect={() => setGoal({ mode: goal.mode })}>
              <X /> Stop building around {around.name}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
