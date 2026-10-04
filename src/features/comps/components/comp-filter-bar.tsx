import { Swords, X } from "lucide-react";
import type { ReactNode } from "react";
import { useChampionOptions, useTraitOptions } from "@/components/game/entity-options";
import { EntityPicker } from "@/components/game/entity-picker";
import { ChampionIcon, TraitIcon } from "@/components/game/icons";
import { SearchInput } from "@/components/layout/search-input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useGameData } from "@/lib/data/hooks";
import { traitStyle } from "@/lib/game/traits";
import { type CompFilters, hasCompFilters } from "../filters";

function Chip({ children, onRemove, label }: { children: ReactNode; onRemove: () => void; label: string }) {
  return (
    <li className="flex items-center gap-1.5 rounded-lg border bg-card py-0.5 pr-0.5 pl-1.5 text-sm">
      {children}
      <Button variant="ghost" size="icon" className="size-7" onClick={onRemove} aria-label={`Remove ${label}`}>
        <X />
      </Button>
    </li>
  );
}

/**
 * Search plus champion and trait pickers that add chips; every chip narrows the comps further. A champion chip
 * can also require that champion to be one of the comp's carries.
 */
export function CompFilterBar({
  value,
  onChange,
  children,
}: {
  value: CompFilters;
  onChange: (changes: CompFilters) => void;
  /** More controls for the same row, e.g. the guides' playstyle filter. */
  children?: ReactNode;
}) {
  const { championsByApi, traitsByApi } = useGameData();
  const champions = value.champions ?? [];
  const carries = value.carries ?? [];
  const traits = value.traits ?? [];
  const championOptions = useChampionOptions().filter((option) => !champions.includes(option.key));
  const traitOptions = useTraitOptions().filter((option) => !traits.includes(option.key));
  const list = (items: string[]) => (items.length ? items : undefined);

  const removeChampion = (apiName: string) =>
    onChange({
      champions: list(champions.filter((entry) => entry !== apiName)),
      carries: list(carries.filter((entry) => entry !== apiName)),
    });
  const toggleCarry = (apiName: string, carry: boolean) =>
    onChange({ carries: list(carry ? [...carries, apiName] : carries.filter((entry) => entry !== apiName)) });

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={value.q ?? ""}
          onChange={(q) => onChange({ q: q || undefined })}
          placeholder="Search comps"
        />
        <EntityPicker
          options={championOptions}
          onChange={(apiName) => apiName && onChange({ champions: [...champions, apiName] })}
          placeholder="Add champion"
          label="Add a champion filter"
          clearable={false}
          className="w-44"
        />
        <EntityPicker
          options={traitOptions}
          onChange={(apiName) => apiName && onChange({ traits: [...traits, apiName] })}
          placeholder="Add trait"
          label="Add a trait filter"
          clearable={false}
          className="w-44"
        />
        {children}
        {hasCompFilters(value) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ q: undefined, champions: undefined, carries: undefined, traits: undefined })}
          >
            Clear filters
          </Button>
        )}
      </div>
      {(champions.length > 0 || traits.length > 0) && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {champions.map((apiName) => {
            const champion = championsByApi.get(apiName);
            const name = champion?.name ?? apiName;
            return (
              <Chip key={apiName} label={name} onRemove={() => removeChampion(apiName)}>
                {champion && <ChampionIcon champion={champion} className="size-6 ring-1" decorative />}
                {name}
                <Toggle
                  size="sm"
                  className="h-7 gap-1 px-1.5 text-xs"
                  pressed={carries.includes(apiName)}
                  onPressedChange={(carry) => toggleCarry(apiName, carry)}
                  aria-label={`Only comps where ${name} is a carry`}
                  title="Only comps where this champion is a carry"
                >
                  <Swords /> Carry
                </Toggle>
              </Chip>
            );
          })}
          {traits.map((apiName) => {
            const trait = traitsByApi.get(apiName);
            const name = trait?.name ?? apiName;
            return (
              <Chip
                key={apiName}
                label={name}
                onRemove={() => onChange({ traits: list(traits.filter((entry) => entry !== apiName)) })}
              >
                {trait && (
                  <TraitIcon
                    trait={trait}
                    style={traitStyle(trait.breakpoints[0]?.style ?? 1)}
                    className="size-6"
                    decorative
                  />
                )}
                {name}
              </Chip>
            );
          })}
        </ul>
      )}
    </div>
  );
}
