import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGameData } from "@/lib/data/hooks";
import { traitStyle } from "@/lib/game/traits";
import type { AugmentTier, ItemKind } from "@/lib/data/schema";
import { cn } from "@/lib/utils";
import { EntityPicker } from "./entity-picker";
import { ChampionIcon, TraitIcon } from "./icons";
import { AUGMENT_TIER_LABEL, AUGMENT_TIER_TEXT, AUGMENT_TIERS, COST_TEXT, COSTS, ITEM_KIND_LABELS } from "./styles";

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

/** A searchable picker of the set's champion traits, with their badges; "All traits" for no filter. */
export function TraitFilter({ value, onChange }: { value?: string; onChange: (trait: string | undefined) => void }) {
  const { traits } = useGameData();
  const options = traits
    .filter((trait) => trait.source === "champion")
    .map((trait) => ({
      key: trait.apiName,
      label: trait.name,
      icon: <TraitIcon trait={trait} style={traitStyle(trait.breakpoints[0]?.style ?? 1)} />,
    }));
  return (
    <EntityPicker
      options={options}
      value={value}
      onChange={onChange}
      placeholder="All traits"
      label="Filter by trait"
    />
  );
}

/** A searchable picker of the set's champions, with their portraits; "All champions" for no filter. */
export function ChampionFilter({
  value,
  onChange,
}: {
  value?: string;
  onChange: (champion: string | undefined) => void;
}) {
  const { champions } = useGameData();
  const options = champions.map((champion) => ({
    key: champion.apiName,
    label: champion.name,
    icon: <ChampionIcon champion={champion} />,
    hint: `${champion.cost}`,
  }));
  return (
    <EntityPicker
      options={options}
      value={value}
      onChange={onChange}
      placeholder="All champions"
      label="Filter by champion"
    />
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

/** Silver / gold / prismatic toggles; pressing the selected one again clears the filter. */
export function AugmentTierFilter({
  value,
  onChange,
}: {
  value?: AugmentTier;
  onChange: (tier: AugmentTier | undefined) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value ? String(value) : ""}
      onValueChange={(next) => onChange(next ? (Number(next) as AugmentTier) : undefined)}
      aria-label="Filter by augment tier"
    >
      {AUGMENT_TIERS.map((tier) => (
        <ToggleGroupItem key={tier} value={String(tier)} className={cn("px-3", AUGMENT_TIER_TEXT[tier])}>
          {AUGMENT_TIER_LABEL[tier]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
