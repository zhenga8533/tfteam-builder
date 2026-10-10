import type { ReactNode } from "react";
import { type ChoiceOption, ChoiceFilter } from "@/components/game/choice-filter";
import {
  DATABASE_SORT_LABELS,
  DATABASE_SORTS,
  type DatabaseSort,
  STAT_SORT_LABELS,
  STAT_SORTS,
  type StatSort,
} from "../sort";

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

/** The panel a tier list's entries sit in when ranked by `sort` instead of laid out in tiers. */
export function StatRanking({ sort, children }: { sort: StatSort; children: ReactNode }) {
  return (
    <section aria-label={`By ${STAT_SORT_LABELS[sort].toLowerCase()}`} className="rounded-xl border bg-card/60 p-3">
      {children}
    </section>
  );
}

/**
 * A database page's order: its own default (`defaultLabel`, e.g. "By cost") or one of `sorts`. Pages offer it only
 * once there are stats to sort by.
 */
export function DatabaseSortFilter({
  defaultLabel,
  sorts = DATABASE_SORTS,
  value,
  onChange,
}: {
  defaultLabel: string;
  sorts?: readonly DatabaseSort[];
  value?: DatabaseSort;
  onChange: (sort?: DatabaseSort) => void;
}) {
  const options: ChoiceOption<"default" | DatabaseSort>[] = [
    { value: "default", label: defaultLabel },
    ...sorts.map((sort) => ({ value: sort, label: DATABASE_SORT_LABELS[sort] })),
  ];
  return (
    <ChoiceFilter
      options={options}
      value={value ?? "default"}
      onChange={(sort) => onChange(sort === "default" ? undefined : sort)}
      label="Sort"
    />
  );
}
