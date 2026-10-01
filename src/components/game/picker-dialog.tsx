import { type ReactNode, useState } from "react";
import { SearchInput } from "@/components/layout/search-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { matches } from "@/lib/search";

export interface PickerOption {
  key: string;
  label: string;
  icon: ReactNode;
}

interface PickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: PickerOption[];
  onPick: (key: string) => void;
}

/** A searchable grid of icons for choosing a champion, item or trait. */
export function PickerDialog({ open, onOpenChange, title, options, onPick }: PickerDialogProps) {
  const [query, setQuery] = useState("");
  const visible = options.filter((option) => matches(option.label, query));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <SearchInput value={query} onChange={setQuery} placeholder="Search" />
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
          {visible.map((option) => (
            <li key={option.key}>
              <button
                type="button"
                onClick={() => {
                  onPick(option.key);
                  onOpenChange(false);
                  setQuery("");
                }}
                className="flex w-full flex-col items-center gap-1 rounded-md p-1 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                {option.icon}
                <span className="line-clamp-2 text-center text-[11px] leading-tight text-muted-foreground">
                  {option.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
