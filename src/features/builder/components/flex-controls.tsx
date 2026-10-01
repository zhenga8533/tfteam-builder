import { ArrowLeftRight, Plus, X } from "lucide-react";
import { useState } from "react";
import { ChampionIcon } from "@/components/game/icons";
import { PickerDialog } from "@/components/game/picker-dialog";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useGameData } from "@/lib/data/hooks";
import type { BoardUnit } from "@/lib/game/board";
import { useBuilder } from "../use-builder";

/** Marks the selected unit as flex and manages the champions that can replace it. */
export function FlexControls({ unit, index }: { unit: BoardUnit; index: number }) {
  const { champions, championsByApi } = useGameData();
  const { toggleFlex, addAlternative, removeAlternative, swapAlternative } = useBuilder();
  const [picking, setPicking] = useState(false);
  const alternatives = unit.alternatives ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Slot</p>
        <Toggle
          size="sm"
          variant="outline"
          pressed={Boolean(unit.flex)}
          onPressedChange={() => toggleFlex(index)}
          title="Flex units are optional; their traits are counted separately"
        >
          Flex unit
        </Toggle>
      </div>
      <ul className="space-y-1" aria-label="Alternatives">
        {alternatives.map((apiName) => {
          const champion = championsByApi.get(apiName);
          if (!champion) return null;
          return (
            <li key={apiName} className="flex items-center gap-2 rounded-md bg-muted/50 p-1 pr-0">
              <ChampionIcon champion={champion} className="size-7" />
              <span className="flex-1 truncate text-sm">or {champion.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => swapAlternative(index, apiName)}
                aria-label={`Use ${champion.name} instead`}
                title="Use instead"
              >
                <ArrowLeftRight />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => removeAlternative(index, apiName)}
                aria-label={`Remove ${champion.name} as an alternative`}
              >
                <X />
              </Button>
            </li>
          );
        })}
      </ul>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setPicking(true)}>
        <Plus /> Add alternative
      </Button>
      <PickerDialog
        open={picking}
        onOpenChange={setPicking}
        title="Add an alternative"
        options={champions
          .filter((champion) => champion.apiName !== unit.apiName && !alternatives.includes(champion.apiName))
          .map((champion) => ({
            key: champion.apiName,
            label: champion.name,
            icon: <ChampionIcon champion={champion} className="size-12" />,
          }))}
        onPick={(apiName) => addAlternative(index, apiName)}
      />
    </div>
  );
}
