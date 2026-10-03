import { Plus, X } from "lucide-react";
import { type KeyboardEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * A guide's tips as one box each, in order, growing to fit long tips. Enter starts a new tip below rather than a
 * line break, Backspace in an empty tip removes it; blank tips are dropped when the file is written.
 */
export function TipsInput({ tips, onChange }: { tips: string[]; onChange: (tips: string[]) => void }) {
  const rows = tips.length ? tips : [""];
  // Set before a change that adds or removes a row; that row's input takes focus once it renders.
  const focusNext = useRef<number | null>(null);

  const focusRef = (index: number) => (input: HTMLTextAreaElement | null) => {
    if (!input || focusNext.current !== index) return;
    focusNext.current = null;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  };

  const insertAfter = (index: number) => {
    focusNext.current = index + 1;
    onChange(rows.toSpliced(index + 1, 0, ""));
  };

  const remove = (index: number) => {
    focusNext.current = Math.max(index - 1, 0);
    onChange(rows.toSpliced(index, 1));
  };

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      insertAfter(index);
    } else if (event.key === "Backspace" && event.currentTarget.value === "" && rows.length > 1) {
      event.preventDefault();
      remove(index);
    }
  };

  return (
    <div className="space-y-1.5">
      <ol className="space-y-1.5">
        {rows.map((tip, index) => (
          <li key={index} className="flex items-start gap-1.5">
            <span className="w-4 shrink-0 pt-2 text-right text-xs text-muted-foreground tabular-nums">{index + 1}</span>
            <Textarea
              ref={focusRef(index)}
              rows={1}
              className="min-h-9 resize-none py-1.5"
              value={tip}
              // A tip is one string, so pasted line breaks become spaces.
              onChange={(event) => onChange(rows.with(index, event.target.value.replace(/\s*\n\s*/g, " ")))}
              onKeyDown={onKeyDown(index)}
              placeholder={index === 0 ? "e.g. Slam Blue Buff early; it goes on Ahri later." : "Another tip"}
              aria-label={`Tip ${index + 1}`}
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => remove(index)}
              disabled={rows.length === 1 && tip === ""}
              aria-label={`Remove tip ${index + 1}`}
            >
              <X />
            </Button>
          </li>
        ))}
      </ol>
      <Button variant="ghost" size="sm" className="ml-5" onClick={() => insertAfter(rows.length - 1)}>
        <Plus /> Add tip
      </Button>
    </div>
  );
}
