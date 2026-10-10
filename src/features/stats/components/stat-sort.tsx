import { type ChoiceOption, ChoiceFilter } from "@/components/game/choice-filter";
import { SORT_LABELS, type SortStat } from "../sort";

/**
 * A list's order: its own default (`defaultLabel`, e.g. "By cost") or one of `sorts`. With `clearable`, the default
 * isn't a toggle of its own: pressing the chosen sort again goes back to it (the phone dropdown still lists it).
 */
export function SortFilter<T extends SortStat>({
  defaultLabel,
  sorts,
  value,
  onChange,
  clearable = false,
}: {
  defaultLabel: string;
  sorts: readonly T[];
  value?: T;
  onChange: (sort?: T) => void;
  clearable?: boolean;
}) {
  const options: ChoiceOption<T>[] = sorts.map((sort) => ({ value: sort, label: SORT_LABELS[sort] }));
  if (clearable) {
    return <ChoiceFilter options={options} value={value} onChange={onChange} label="Sort" noneLabel={defaultLabel} />;
  }
  return (
    <ChoiceFilter
      options={[{ value: "default", label: defaultLabel }, ...options]}
      value={value ?? "default"}
      onChange={(sort) => onChange(sort === "default" ? undefined : (sort as T))}
      label="Sort"
    />
  );
}
