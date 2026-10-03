import { ClipboardCopy, Download, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { tierListForSet } from "@/content";
import { formatContentSource, tierListSource } from "@/content/serialize";
import type { TierRows } from "@/content/types";
import { downloadBlob } from "@/lib/canvas";
import { useActiveSet } from "@/lib/data/hooks";
import { githubFileLink } from "@/lib/github";
import { type ExportMode, exportTierList, type MakerKind } from "../model";
import type { MakerSource } from "../use-maker-source";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: MakerKind;
  rows: TierRows;
  source: MakerSource;
}

const count = (rows: TierRows) => Object.values(rows).reduce((total, keys) => total + keys.length, 0);

/** Writes the edited list into the set's tier list file, to download, copy or propose on GitHub. */
export function ExportDialog({ open, onOpenChange, kind, rows, source }: ExportDialogProps) {
  const { set } = useActiveSet();
  const existing = tierListForSet(set);
  const statsBased = kind !== "augments" && source.statTiers !== null;
  const [mode, setMode] = useState<ExportMode>("overrides");
  const effectiveMode: ExportMode = statsBased ? mode : "fallback";

  const { list, unranked } = exportTierList({
    existing,
    set,
    kind,
    rows,
    mode: effectiveMode,
    statTiers: source.statTiers,
    today: new Date().toISOString().slice(0, 10),
  });
  const path = `src/content/tierlists/set${set}.ts`;
  const raw = tierListSource(list);
  const [formatted, setFormatted] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    formatContentSource(raw).then(
      (result) => current && setFormatted(result),
      (error: unknown) => {
        console.error("Couldn't format the tier list file.", error);
        if (current) setFormatted(raw);
      },
    );
    return () => {
      current = false;
    };
  }, [raw]);

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
      return true;
    } catch {
      toast.error("Couldn't access the clipboard.");
      return false;
    }
  };

  const download = () => formatted && downloadBlob(new Blob([formatted], { type: "text/typescript" }), `set${set}.ts`);

  const submit = async () => {
    if (!formatted) return;
    const { url, paste } = githubFileLink(path, formatted, Boolean(existing));
    const message = existing
      ? "Tier list file copied. Paste it over the file on the GitHub page that just opened."
      : "Tier list file copied. Paste it into the GitHub page that just opened.";
    if (!paste || (await copy(formatted, message))) window.open(url, "_blank", "noopener");
  };

  const plural = (total: number, noun: string) => `${total} ${noun}${total === 1 ? "" : "s"}`;
  const summary =
    kind === "augments"
      ? `${plural(count(rows), "augment")}, replacing the augment tier list.`
      : effectiveMode === "overrides"
        ? `${plural(count(list[kind] ?? {}), "override")}: only the entries you placed in a different tier than their stats give them.`
        : statsBased
          ? `${plural(count(rows), "entry")} as the fallback, shown only while there are no match stats.`
          : `${plural(count(rows), "entry")} as the fallback. There are no match stats for this set, so this is the list the site shows.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export to the site</DialogTitle>
          <DialogDescription>
            Updates <code className="text-foreground">{path}</code>, keeping its other sections.
          </DialogDescription>
        </DialogHeader>

        {statsBased && (
          <ToggleGroup
            type="single"
            variant="outline"
            value={mode}
            onValueChange={(value) => value && setMode(value as ExportMode)}
            aria-label="Save as"
            className="w-full"
          >
            <ToggleGroupItem value="overrides" className="flex-1">
              Overrides on the stats
            </ToggleGroupItem>
            <ToggleGroupItem value="fallback" className="flex-1">
              Fallback without stats
            </ToggleGroupItem>
          </ToggleGroup>
        )}
        <div className="space-y-1.5 text-sm">
          <p>{summary}</p>
          {unranked.length > 0 && (
            <p className="text-muted-foreground">
              {unranked.length} {unranked.length === 1 ? "entry" : "entries"} you left unranked will still show at their
              stats tier; overrides can only move entries, not hide them.
            </p>
          )}
        </div>
        <details className="min-w-0 rounded-md border">
          <summary className="cursor-pointer px-3 py-2 text-sm text-muted-foreground">File: {path}</summary>
          <pre className="max-h-80 overflow-auto border-t bg-muted/40 p-3 text-xs">
            <code>{formatted ?? raw}</code>
          </pre>
        </details>

        <DialogFooter>
          <Button variant="outline" onClick={download} disabled={!formatted}>
            <Download /> Download
          </Button>
          <Button
            variant="outline"
            onClick={() => formatted && copy(formatted, "Tier list file copied.")}
            disabled={!formatted}
          >
            <ClipboardCopy /> Copy
          </Button>
          <Button onClick={submit} disabled={!formatted}>
            <Send /> Submit on GitHub
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
