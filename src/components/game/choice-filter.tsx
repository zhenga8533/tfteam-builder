import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  /** Extra classes for the option, e.g. its color. */
  className?: string;
}

/** The dropdown's entry for "no choice", which Radix Select can't represent as an empty value. */
const NONE = "__none";

/**
 * One choice among a handful of options: toggles where there's room, and a dropdown on phones, where a row of long
 * labels would wrap. With `noneLabel` the choice can be cleared, by pressing the selected toggle again or picking the
 * dropdown's first entry.
 */
export function ChoiceFilter<T extends string>({
  options,
  value,
  onChange,
  label,
  noneLabel,
}: {
  options: ChoiceOption<T>[];
  value?: T;
  onChange: (value: T | undefined) => void;
  /** What's being chosen, for screen readers ("Item category"). */
  label: string;
  noneLabel?: string;
}) {
  const choose = (next: string) => {
    if (next && next !== NONE) onChange(next as T);
    else if (noneLabel) onChange(undefined);
  };
  return (
    <>
      <ToggleGroup
        type="single"
        variant="outline"
        value={value ?? ""}
        onValueChange={choose}
        className="flex-wrap max-sm:hidden"
        aria-label={label}
      >
        {options.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value} className={cn("px-3", option.className)}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Select value={value ?? NONE} onValueChange={choose}>
        <SelectTrigger className="w-full sm:hidden" aria-label={label}>
          <SelectValue placeholder={noneLabel} />
        </SelectTrigger>
        <SelectContent>
          {noneLabel && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className={option.className}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
