import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGameData } from "@/lib/data/hooks";
import type { ItemKind } from "@/lib/data/schema";
import { cn } from "@/lib/utils";
import { COST_TEXT, COSTS, ITEM_KIND_LABELS } from "./styles";

const ALL = "all";

/** Shop cost toggles; pressing the selected cost again clears the filter. */
export function CostFilter({ value, onChange }: { value?: number; onChange: (cost: number | undefined) => void }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value ? String(value) : ""}
      onValueChange={(next) => onChange(next ? Number(next) : undefined)}
      aria-label="Filter by cost"
    >
      {COSTS.map((cost) => (
        <ToggleGroupItem key={cost} value={String(cost)} className={cn("w-9 font-semibold", COST_TEXT[cost])}>
          {cost}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** A select of the set's champion traits, with "All traits" for no filter. */
export function TraitFilter({ value, onChange }: { value?: string; onChange: (trait: string | undefined) => void }) {
  const { traits } = useGameData();
  return (
    <Select value={value ?? ALL} onValueChange={(next) => onChange(next === ALL ? undefined : next)}>
      <SelectTrigger className="w-44" aria-label="Filter by trait">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All traits</SelectItem>
        {traits
          .filter((trait) => trait.source === "champion")
          .map((trait) => (
            <SelectItem key={trait.apiName} value={trait.apiName}>
              {trait.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

/** Item category toggles; `allowNone` lets pressing the selected one again clear the filter. */
export function ItemKindFilter({
  kinds,
  value,
  onChange,
  allowNone = false,
}: {
  kinds: ItemKind[];
  value?: ItemKind;
  onChange: (kind: ItemKind | undefined) => void;
  allowNone?: boolean;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value ?? ""}
      onValueChange={(next) => (next || allowNone) && onChange((next as ItemKind) || undefined)}
      className="flex-wrap"
      aria-label="Item category"
    >
      {kinds.map((kind) => (
        <ToggleGroupItem key={kind} value={kind} className="px-3">
          {ITEM_KIND_LABELS[kind]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
