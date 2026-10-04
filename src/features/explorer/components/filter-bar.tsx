import { Plus, X } from "lucide-react";
import { useState } from "react";
import { ChampionIcon, ItemIcon, TraitIcon } from "@/components/game/icons";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGameData } from "@/lib/data/hooks";
import type { ExplorerFilter } from "@/lib/explorer/engine";
import { traitStyle } from "@/lib/game/traits";
import { PickerDialog } from "@/components/game/picker-dialog";

type Picker = { kind: "champion" } | { kind: "trait" } | { kind: "item"; index: number } | null;

const ANY = "any";
const LEVELS = [7, 8, 9, 10];
const MAX_ITEMS = 3;

interface FilterBarProps {
  filters: ExplorerFilter[];
  onChange: (filters: ExplorerFilter[]) => void;
}

/** Filter chips for units (star level, items), traits (breakpoint) and level, plus pickers to add more. */
export function FilterBar({ filters, onChange }: FilterBarProps) {
  const { champions, items, traits, championsByApi, itemsByApi, traitsByApi } = useGameData();
  const [picker, setPicker] = useState<Picker>(null);

  const replace = (index: number, filter: ExplorerFilter) =>
    onChange(filters.map((current, i) => (i === index ? filter : current)));
  const remove = (index: number) => onChange(filters.filter((_, i) => i !== index));
  const level = filters.find((filter) => filter.type === "level");
  const setLevel = (value: string) =>
    onChange([
      ...filters.filter((filter) => filter.type !== "level"),
      ...(value === ANY ? [] : [{ type: "level" as const, min: Number(value) }]),
    ]);

  const chips = filters.filter((filter) => filter.type !== "level");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setPicker({ kind: "champion" })}>
          <Plus /> Champion
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPicker({ kind: "trait" })}>
          <Plus /> Trait
        </Button>
        <Select value={level ? String(level.min) : ANY} onValueChange={setLevel}>
          <SelectTrigger size="sm" className="w-auto" aria-label="Minimum level">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any level</SelectItem>
            {LEVELS.map((value) => (
              <SelectItem key={value} value={String(value)}>
                Level {value}+
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filters.length > 0 && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => onChange([])}>
            Clear all
          </Button>
        )}
      </div>

      <div
        className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-dashed p-1.5"
        aria-label="Active filters"
      >
        {chips.length === 0 && (
          <p className="px-1.5 text-sm text-muted-foreground">
            No champion or trait filters: showing every board in the sample.
          </p>
        )}
        {filters.map((filter, index) => {
          if (filter.type === "unit") {
            const champion = championsByApi.get(filter.unit);
            if (!champion) return null;
            return (
              <div key={index} className="flex items-center gap-1.5 rounded-lg border bg-card py-1 pr-1 pl-1.5">
                <ChampionIcon champion={champion} className="size-7" decorative />
                <span className="text-sm font-medium">{champion.name}</span>
                <Select
                  value={String(filter.minStar ?? ANY)}
                  onValueChange={(value) =>
                    replace(index, { ...filter, minStar: value === ANY ? undefined : Number(value) })
                  }
                >
                  <SelectTrigger size="sm" className="h-7 w-auto px-2" aria-label="Minimum star level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Any ★</SelectItem>
                    <SelectItem value="2">★★+</SelectItem>
                    <SelectItem value="3">★★★</SelectItem>
                  </SelectContent>
                </Select>
                {(filter.items ?? []).map((apiName, itemIndex) => {
                  const item = itemsByApi.get(apiName);
                  return item ? (
                    <button
                      key={itemIndex}
                      type="button"
                      onClick={() =>
                        replace(index, { ...filter, items: filter.items!.filter((_, i) => i !== itemIndex) })
                      }
                      aria-label={`Remove ${item.name}`}
                      title={`Remove ${item.name}`}
                    >
                      <ItemIcon item={item} className="size-6 hover:opacity-60" />
                    </button>
                  ) : null;
                })}
                {(filter.items?.length ?? 0) < MAX_ITEMS && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setPicker({ kind: "item", index })}
                    aria-label={`Add an item on ${champion.name}`}
                  >
                    <Plus />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => remove(index)}
                  aria-label="Remove"
                >
                  <X />
                </Button>
              </div>
            );
          }
          if (filter.type === "trait") {
            const trait = traitsByApi.get(filter.trait);
            if (!trait) return null;
            const breakpoint = trait.breakpoints.find((b) => b.minUnits === filter.minUnits) ?? trait.breakpoints[0];
            return (
              <div key={index} className="flex items-center gap-1.5 rounded-lg border bg-card py-1 pr-1 pl-1.5">
                <TraitIcon
                  trait={trait}
                  style={breakpoint ? traitStyle(breakpoint.style) : "inactive"}
                  className="size-7"
                  decorative
                />
                <span className="text-sm font-medium">{trait.name}</span>
                <Select
                  value={String(filter.minUnits)}
                  onValueChange={(value) => replace(index, { ...filter, minUnits: Number(value) })}
                >
                  <SelectTrigger size="sm" className="h-7 w-auto px-2" aria-label="Minimum breakpoint">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {trait.breakpoints.map((b) => (
                      <SelectItem key={b.minUnits} value={String(b.minUnits)}>
                        {b.minUnits}+
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => remove(index)}
                  aria-label="Remove"
                >
                  <X />
                </Button>
              </div>
            );
          }
          return null;
        })}
      </div>

      <PickerDialog
        open={picker?.kind === "champion"}
        onOpenChange={(open) => !open && setPicker(null)}
        title="Add a champion"
        options={champions.map((champion) => ({
          key: champion.apiName,
          label: champion.name,
          icon: <ChampionIcon champion={champion} className="size-12" />,
        }))}
        onPick={(unit) => onChange([...filters, { type: "unit", unit }])}
      />
      <PickerDialog
        open={picker?.kind === "trait"}
        onOpenChange={(open) => !open && setPicker(null)}
        title="Add a trait"
        options={traits.map((trait) => ({
          key: trait.apiName,
          label: trait.name,
          icon: <TraitIcon trait={trait} style={traitStyle(trait.breakpoints[0]?.style ?? 1)} className="size-10" />,
        }))}
        onPick={(trait) =>
          onChange([
            ...filters,
            { type: "trait", trait, minUnits: traitsByApi.get(trait)?.breakpoints[0]?.minUnits ?? 1 },
          ])
        }
      />
      <PickerDialog
        open={picker?.kind === "item"}
        onOpenChange={(open) => !open && setPicker(null)}
        title="Add an item"
        options={items
          .filter((item) => item.kind !== "component")
          .map((item) => ({ key: item.apiName, label: item.name, icon: <ItemIcon item={item} className="size-10" /> }))}
        onPick={(item) => {
          if (picker?.kind !== "item") return;
          const filter = filters[picker.index];
          if (filter?.type === "unit") replace(picker.index, { ...filter, items: [...(filter.items ?? []), item] });
        }}
      />
    </div>
  );
}
