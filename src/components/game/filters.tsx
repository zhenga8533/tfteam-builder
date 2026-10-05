import { SearchInput } from "@/components/layout/search-input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { AugmentTier, ItemKind } from "@/lib/data/schema";
import type { AugmentFilters, ChampionFilters, ItemFilters } from "./filter-params";
import { cn } from "@/lib/utils";
import { EntityPicker } from "./entity-picker";
import { useChampionOptions, useTraitOptions } from "./entity-options";
import { AUGMENT_TIER_LABEL, AUGMENT_TIER_TEXT, AUGMENT_TIERS, COST_TEXT, COSTS, ITEM_KIND_LABELS } from "./styles";

/** Shop cost toggles; pressing the selected cost again clears the filter. */
function CostFilter({ value, onChange }: { value?: number; onChange: (cost: number | undefined) => void }) {
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
  const options = useTraitOptions();
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
  only,
  placeholder = "All champions",
  className,
}: {
  value?: string;
  onChange: (champion: string | undefined) => void;
  /** Limits the choices to these apiNames, e.g. champions in the shop pool. */
  only?: string[];
  placeholder?: string;
  className?: string;
}) {
  const options = useChampionOptions(only);
  return (
    <EntityPicker
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      label="Filter by champion"
      className={className}
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
function AugmentTierFilter({
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

export function ChampionFilterBar({
  value,
  onChange,
}: {
  value: ChampionFilters;
  onChange: (changes: ChampionFilters) => void;
}) {
  return (
    <>
      <SearchInput
        value={value.q ?? ""}
        onChange={(q) => onChange({ q: q || undefined })}
        placeholder="Search champions"
      />
      <CostFilter value={value.cost} onChange={(cost) => onChange({ cost })} />
      <TraitFilter value={value.trait} onChange={(trait) => onChange({ trait })} />
    </>
  );
}

export function AugmentFilterBar({
  value,
  onChange,
}: {
  value: AugmentFilters;
  onChange: (changes: AugmentFilters) => void;
}) {
  return (
    <>
      <SearchInput
        value={value.q ?? ""}
        onChange={(q) => onChange({ q: q || undefined })}
        placeholder="Search augments"
      />
      <AugmentTierFilter value={value.tier} onChange={(tier) => onChange({ tier })} />
    </>
  );
}

/** Item search plus category toggles (shown when there's more than one category); pressing a category again clears it. */
export function ItemFilterBar({
  value,
  onChange,
  kinds,
}: {
  value: ItemFilters;
  onChange: (value: ItemFilters) => void;
  kinds: ItemKind[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        value={value.q ?? ""}
        onChange={(q) => onChange({ ...value, q: q || undefined })}
        placeholder="Search items"
        className="max-w-xs"
      />
      {kinds.length > 1 && (
        <ItemKindFilter kinds={kinds} value={value.kind} onChange={(kind) => onChange({ ...value, kind })} allowNone />
      )}
    </div>
  );
}
