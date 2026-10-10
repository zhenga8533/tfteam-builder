import { type ChoiceOption, ChoiceFilter } from "@/components/game/choice-filter";
import { SORT_LABELS, type SortStat } from "../sort";

/** A list's order: its own default (`defaultLabel`, e.g. "By cost") or one of `sorts`. */
export function SortFilter<T extends SortStat>({
  defaultLabel,
  sorts,
  value,
  onChange,
}: {
  defaultLabel: string;
  sorts: readonly T[];
  value?: T;
  onChange: (sort?: T) => void;
}) {
  const options: ChoiceOption<"default" | T>[] = [
    { value: "default", label: defaultLabel },
    ...sorts.map((sort) => ({ value: sort, label: SORT_LABELS[sort] })),
  ];
  return (
    <ChoiceFilter
      options={options}
      value={value ?? "default"}
      onChange={(sort) => onChange(sort === "default" ? undefined : (sort as T))}
      label="Sort"
    />
  );
}
