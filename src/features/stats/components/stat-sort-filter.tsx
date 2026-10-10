import { type ChoiceOption, ChoiceFilter } from "@/components/game/choice-filter";
import { STAT_SORT_LABELS, STAT_SORTS, type StatSort } from "../sort";

const OPTIONS: ChoiceOption<"tier" | StatSort>[] = [
  { value: "tier", label: "By tier" },
  ...STAT_SORTS.map((sort) => ({ value: sort, label: `By ${STAT_SORT_LABELS[sort].toLowerCase()}` })),
];

/** Tiers, or a single list ranked by one stat. */
export function StatSortFilter({ value, onChange }: { value?: StatSort; onChange: (sort?: StatSort) => void }) {
  return (
    <ChoiceFilter
      options={OPTIONS}
      value={value ?? "tier"}
      onChange={(sort) => onChange(sort === "tier" ? undefined : sort)}
      label="Sort"
    />
  );
}
