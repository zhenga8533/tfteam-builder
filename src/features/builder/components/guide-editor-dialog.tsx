import { ClipboardCopy, Download, Send, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { EntityPicker } from "@/components/game/entity-picker";
import { AugmentIcon, ChampionIcon } from "@/components/game/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  boardToCompUnits,
  compFileName,
  compSource,
  EMPTY_GUIDE,
  formatCompSource,
  type GuideDetails,
} from "@/content/serialize";
import { type Difficulty, type Playstyle, PLAYSTYLES, type Tier, TIERS } from "@/content/types";
import { CompCard } from "@/features/comps/components/comp-card";
import { TierBadge } from "@/features/comps/components/tier-badge";
import { useGameData } from "@/lib/data/hooks";
import { boardUnits } from "@/lib/game/board";
import { pickCarries } from "@/lib/game/comp-signature";
import { REPOSITORY } from "@/lib/site";
import { useBuilder } from "../use-builder";
import { TipsInput } from "./tips-input";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
/** GitHub rejects longer URLs; past this the file is copied and pasted into an empty new-file page instead. */
const MAX_URL_LENGTH = 8000;

interface GuideEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Details to start from, e.g. a detected comp's name and carries. */
  initial?: Partial<GuideDetails>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}

/**
 * Turns the Team Builder's board into a comp guide: the details are filled in here, and the result is a
 * formatted `src/content/comps` module to download, copy or submit as a pull request on GitHub.
 */
export function GuideEditorDialog({ open, onOpenChange, initial }: GuideEditorDialogProps) {
  const { set, boards } = useBuilder();
  const { championsByApi, augments, augmentsByApi } = useGameData();
  // Comp guides hold a final board and an optional early board: the highest and lowest levels.
  const board = boards.at(-1)?.board ?? [];
  const early = boards.length > 1 ? boards[0]?.board : undefined;
  const onBoard = [...new Set(boardUnits(board).map((unit) => unit.apiName))];

  // Until carries are picked by hand they follow the board, using the same rule as detected comps.
  const [draft, setDraft] = useState<Omit<GuideDetails, "carries"> & { carries?: string[] }>(() => ({
    ...EMPTY_GUIDE,
    carries: undefined,
    ...initial,
  }));
  const guide: GuideDetails = {
    ...draft,
    carries:
      draft.carries ??
      pickCarries(
        boardUnits(board)
          .filter((unit) => !unit.flex)
          .map((unit) => ({
            apiName: unit.apiName,
            items: unit.items.length,
            cost: championsByApi.get(unit.apiName)?.cost ?? 0,
          })),
      ),
  };
  const update = (changes: Partial<GuideDetails>) => setDraft((current) => ({ ...current, ...changes }));

  const source = compSource({ guide, set, board, early });
  const [formatted, setFormatted] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    formatCompSource(source).then(
      (result) => current && setFormatted(result),
      (error: unknown) => {
        console.error("Couldn't format the comp file.", error);
        if (current) setFormatted(source);
      },
    );
    return () => {
      current = false;
    };
  }, [source]);

  const fileName = compFileName(guide.name);
  const missing = [!guide.name.trim() && "a name", !guide.summary.trim() && "a summary"].filter(Boolean);
  const ready = missing.length === 0 && formatted !== null;

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

  const download = () => {
    if (!formatted) return;
    const url = URL.createObjectURL(new Blob([formatted], { type: "text/typescript" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
    link.click();
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    if (!formatted) return;
    const page = `${REPOSITORY}/new/main/src/content/comps/set${set}?filename=${encodeURIComponent(fileName)}`;
    const prefilled = `${page}&value=${encodeURIComponent(formatted)}`;
    if (prefilled.length <= MAX_URL_LENGTH) {
      window.open(prefilled, "_blank", "noopener");
      return;
    }
    if (await copy(formatted, "Comp file copied. Paste it into the GitHub page that just opened.")) {
      window.open(page, "_blank", "noopener");
    }
  };

  const augmentOptions = augments
    .filter((augment) => !guide.augments.includes(augment.apiName))
    .map((augment) => ({
      key: augment.apiName,
      label: augment.name,
      icon: <AugmentIcon augment={augment} className="size-5" />,
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Write a comp guide</DialogTitle>
          <DialogDescription>
            The board comes from the Team Builder
            {early ? ", with the lowest level as the early board" : ""}. Submitting opens GitHub with the file ready to
            propose as a pull request.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Field label="Name">
              <Input
                value={guide.name}
                onChange={(event) => update({ name: event.target.value })}
                placeholder="e.g. Blossom Ahri"
                aria-label="Comp name"
                autoFocus
              />
            </Field>
            <div className="flex flex-wrap gap-4">
              <Field label="Tier">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={guide.tier}
                  onValueChange={(tier) => tier && update({ tier: tier as Tier })}
                  aria-label="Tier"
                >
                  {TIERS.map((tier) => (
                    <ToggleGroupItem key={tier} value={tier} className="px-3">
                      {tier}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
              <Field label="Playstyle">
                <Select
                  value={guide.playstyle}
                  onValueChange={(playstyle) => update({ playstyle: playstyle as Playstyle })}
                >
                  <SelectTrigger className="w-36" aria-label="Playstyle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAYSTYLES.map((playstyle) => (
                      <SelectItem key={playstyle} value={playstyle}>
                        {playstyle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Difficulty">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={guide.difficulty}
                  onValueChange={(difficulty) => difficulty && update({ difficulty: difficulty as Difficulty })}
                  aria-label="Difficulty"
                >
                  {DIFFICULTIES.map((difficulty) => (
                    <ToggleGroupItem key={difficulty} value={difficulty} className="px-3">
                      {difficulty}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
            </div>
            <Field label="Summary">
              <Textarea
                value={guide.summary}
                onChange={(event) => update({ summary: event.target.value })}
                placeholder="How the comp wins and when to play it."
                aria-label="Summary"
              />
            </Field>
            <Field label="Carries">
              {onBoard.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add champions to the board first.</p>
              ) : (
                <ToggleGroup
                  type="multiple"
                  variant="outline"
                  value={guide.carries}
                  onValueChange={(carries) => update({ carries })}
                  aria-label="Carries"
                  spacing={1.5}
                  className="flex-wrap"
                >
                  {onBoard.map((apiName) => {
                    const champion = championsByApi.get(apiName);
                    return (
                      <ToggleGroupItem key={apiName} value={apiName} className="gap-1.5 px-2">
                        {champion && <ChampionIcon champion={champion} className="size-5 ring-1" />}
                        {champion?.name ?? apiName}
                      </ToggleGroupItem>
                    );
                  })}
                </ToggleGroup>
              )}
            </Field>
            <Field label="Augments, strongest first">
              {guide.augments.length > 0 && (
                <ol className="flex flex-wrap gap-1.5">
                  {guide.augments.map((apiName) => {
                    const augment = augmentsByApi.get(apiName);
                    return (
                      <li
                        key={apiName}
                        className="flex items-center gap-1.5 rounded-md border bg-card py-0.5 pr-0.5 pl-1.5 text-sm"
                      >
                        {augment && <AugmentIcon augment={augment} className="size-5" />}
                        {augment?.name ?? apiName}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => update({ augments: guide.augments.filter((entry) => entry !== apiName) })}
                          aria-label={`Remove ${augment?.name ?? apiName}`}
                        >
                          <X />
                        </Button>
                      </li>
                    );
                  })}
                </ol>
              )}
              <EntityPicker
                options={augmentOptions}
                onChange={(apiName) => apiName && update({ augments: [...guide.augments, apiName] })}
                placeholder="Add an augment"
                label="Add an augment"
                clearable={false}
              />
            </Field>
            <Field label="Tips">
              <TipsInput tips={guide.tips} onChange={(tips) => update({ tips })} />
            </Field>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Preview</p>
            <div className="flex items-start gap-3">
              <TierBadge tier={guide.tier} className="size-10 shrink-0 text-xl" />
              <div className="min-w-0 flex-1">
                <CompCard
                  preview
                  comp={{
                    ...guide,
                    name: guide.name.trim() || "New Comp",
                    slug: "",
                    set,
                    board: boardToCompUnits(board, guide.carries),
                    updatedAt: "",
                  }}
                />
              </div>
            </div>
            <details className="rounded-md border">
              <summary className="cursor-pointer px-3 py-2 text-sm text-muted-foreground">
                File: src/content/comps/set{set}/{fileName}
              </summary>
              <pre className="max-h-80 overflow-auto border-t bg-muted/40 p-3 text-xs">
                <code>{formatted ?? source}</code>
              </pre>
            </details>
          </div>
        </div>

        <DialogFooter className="items-center">
          {missing.length > 0 && (
            <p className="mr-auto text-sm text-muted-foreground">Add {missing.join(" and ")} to finish.</p>
          )}
          <Button variant="outline" onClick={download} disabled={!ready}>
            <Download /> Download
          </Button>
          <Button variant="outline" onClick={() => formatted && copy(formatted, "Comp file copied.")} disabled={!ready}>
            <ClipboardCopy /> Copy
          </Button>
          <Button onClick={submit} disabled={!ready}>
            <Send /> Submit on GitHub
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
