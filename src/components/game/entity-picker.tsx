import { Check, ChevronDown, Search, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { matches } from "@/lib/search";
import { cn } from "@/lib/utils";

export interface EntityOption {
  key: string;
  label: string;
  icon: ReactNode;
  hint?: string;
}

interface EntityPickerProps {
  options: EntityOption[];
  value?: string;
  onChange: (key: string | undefined) => void;
  /** Shown when nothing is picked, and as the option that clears the filter, e.g. "All traits". */
  placeholder: string;
  /** Accessible name of the control, e.g. "Filter by trait". */
  label: string;
  /** Lists the placeholder as an option that clears the choice; off for pickers that add to a list. */
  clearable?: boolean;
  className?: string;
}

/** A searchable dropdown of icons and names (champions, traits…) that filters by one entry or none. */
export function EntityPicker({
  options,
  value,
  onChange,
  placeholder,
  label,
  clearable = true,
  className,
}: EntityPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const selected = options.find((option) => option.key === value);
  // The clear option leads the list while nothing is being searched for.
  const shown: (EntityOption | null)[] = [
    ...(query || !clearable ? [] : [null]),
    ...options.filter((option) => matches(option.label, query)),
  ];
  const highlighted = Math.min(active, shown.length - 1);

  // Every open starts from a blank search, however the last one closed.
  const setOpenFresh = (next: boolean) => {
    setOpen(next);
    setQuery("");
    setActive(0);
  };

  const pick = (option: EntityOption | null | undefined) => {
    if (option === undefined) return;
    onChange(option?.key);
    setOpenFresh(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpenFresh}>
      <div className={cn("relative flex w-48", className)}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            aria-label={`${label}: ${selected?.label ?? placeholder}`}
            className="w-full justify-start gap-2 pr-8 font-normal"
          >
            {selected ? (
              <>
                <span className="shrink-0 [&>*]:size-5">{selected.icon}</span>
                <span className="truncate">{selected.label}</span>
              </>
            ) : (
              <span className="truncate text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        {selected ? (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            aria-label={`Clear ${label.toLowerCase()}`}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : (
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 opacity-60" />
        )}
      </div>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="flex items-center gap-2 border-b px-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") setActive(Math.min(highlighted + 1, shown.length - 1));
              else if (event.key === "ArrowUp") setActive(Math.max(highlighted - 1, 0));
              else if (event.key === "Enter") pick(shown[highlighted]);
              else return;
              event.preventDefault();
            }}
            placeholder="Search"
            aria-label={`Search ${label.toLowerCase()}`}
            className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul role="listbox" aria-label={label} className="max-h-72 overflow-y-auto p-1">
          {shown.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">Nothing matches.</li>}
          {shown.map((option, index) => (
            <li key={option?.key ?? "all"}>
              <button
                type="button"
                role="option"
                aria-selected={(option?.key ?? undefined) === value}
                onMouseMove={() => setActive(index)}
                onClick={() => pick(option)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                  index === highlighted && "bg-accent",
                )}
              >
                {option ? (
                  <span className="shrink-0 [&>*]:size-6">{option.icon}</span>
                ) : (
                  <span className="size-6 shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate">{option?.label ?? placeholder}</span>
                {option?.hint && <span className="text-xs text-muted-foreground">{option.hint}</span>}
                {(option?.key ?? undefined) === value && <Check className="size-4 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
