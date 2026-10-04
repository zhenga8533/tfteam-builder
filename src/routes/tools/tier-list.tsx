import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Copy, Eraser, FileCode, ImageDown, Link2, RotateCcw, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TierRows } from "@/content/types";
import { ExportDialog } from "@/features/tier-maker/components/export-dialog";
import { MakerBoard } from "@/features/tier-maker/components/maker-board";
import {
  decodeTierListCode,
  encodeTierListCode,
  isMakerKind,
  MAKER_KINDS,
  type MakerKind,
} from "@/features/tier-maker/model";
import { useDraft, useTierMakerStore } from "@/features/tier-maker/store";
import { renderTierListImage } from "@/features/tier-maker/tier-image";
import { type MakerSource, useMakerSource } from "@/features/tier-maker/use-maker-source";
import { imageFileName } from "@/lib/canvas";
import { copyImage, copyText, saveImage, siteUrl } from "@/lib/share";
import { useActiveSet } from "@/lib/data/hooks";
import { stringParam } from "@/lib/search";
import { useUpdateSearch } from "@/lib/use-update-search";

interface TierListMakerSearch {
  kind?: MakerKind;
  /** A shared tier list's code; it's loaded into the maker, then dropped from the URL. */
  list?: string;
}

const KIND_LABEL: Record<MakerKind, string> = {
  champions: "Champions",
  items: "Items",
  traits: "Traits",
  augments: "Augments",
};

const TITLE: Record<MakerKind, string> = {
  champions: "Champion Tier List",
  items: "Item Tier List",
  traits: "Trait Tier List",
  augments: "Augment Tier List",
};

export const Route = createFileRoute("/tools/tier-list")({
  head: () => ({ meta: [{ title: "Tier List Maker · TFTeam Builder" }] }),
  validateSearch: (search: Record<string, unknown>): TierListMakerSearch => ({
    kind: isMakerKind(search.kind) ? search.kind : undefined,
    list: stringParam(search.list),
  }),
  component: TierListMakerPage,
});

/** Loads a shared link's tier list as the draft for its kind, then drops the code from the URL. */
function useSharedList(code: string | undefined, kind: MakerKind, source: MakerSource) {
  const { set } = useActiveSet();
  const setDraft = useTierMakerStore((state) => state.setDraft);
  const update = useUpdateSearch<TierListMakerSearch>();
  // The effect reruns before the URL drops the code, so each code is handled once.
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!code || handled.current === code) return;
    const peek = decodeTierListCode(code, () => true);
    if (peek.ok && peek.set === set && peek.kind !== kind) {
      // Switch tabs first, so the entries it's checked against are that kind's.
      update({ kind: peek.kind });
      return;
    }
    handled.current = code;
    const shared = decodeTierListCode(code, (key) => source.byKey.has(key));
    if (!shared.ok) toast.error(shared.error);
    else if (shared.set !== set) toast.error(`That tier list is for Set ${shared.set}. Switch sets to open it.`);
    else {
      setDraft(set, shared.kind, shared.rows);
      toast.success("Loaded the shared tier list.");
    }
    update({ list: undefined });
  }, [code, kind, set, source.byKey, setDraft, update]);
}

const ranked = (rows: TierRows) => Object.values(rows).reduce((total, keys) => total + keys.length, 0);

function TierListMakerPage() {
  const { set } = useActiveSet();
  const search = Route.useSearch();
  const update = useUpdateSearch<TierListMakerSearch>();
  const kind = search.kind ?? "champions";
  const source = useMakerSource(kind);
  const draft = useDraft(set, kind);
  const { setDraft, clearDraft } = useTierMakerStore();
  const [exporting, setExporting] = useState(false);
  useSharedList(search.list, kind, source);

  const rows = draft ?? source.siteRows;
  const change = (next: TierRows) => setDraft(set, kind, next);
  const withUndo = (message: string, apply: () => void) => {
    const previous = draft;
    apply();
    toast(message, {
      action: {
        label: "Undo",
        onClick: () => (previous ? setDraft(set, kind, previous) : clearDraft(set, kind)),
      },
    });
  };

  const image = () =>
    renderTierListImage({
      title: TITLE[kind],
      subtitle: `Set ${set} · ${ranked(rows)} ranked`,
      rows,
      byKey: source.byKey,
    });

  const copyLink = () =>
    copyText(siteUrl("tools/tier-list", { list: encodeTierListCode(set, kind, rows) }), "Tier list link copied.", {
      showOnFailure: true,
    });
  const copyListImage = () => copyImage(image(), "Tier list image copied.");
  const saveListImage = () => saveImage(image, imageFileName(`set ${set} ${TITLE[kind]}`));

  return (
    <>
      <PageHeader
        title="Tier List Maker"
        description="Drag champions, items, traits or augments between tiers, or click one to pick its tier. It starts from the site's current list; share yours, or propose it for the site."
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          variant="outline"
          value={kind}
          onValueChange={(value) => isMakerKind(value) && update({ kind: value })}
          aria-label="What to rank"
        >
          {MAKER_KINDS.map((option) => (
            <ToggleGroupItem key={option} value={option} className="px-3">
              {KIND_LABEL[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="mr-auto text-sm text-muted-foreground">
          {draft ? "Your edits, saved in this browser" : "The site's current list"}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => withUndo("Back to the site's list.", () => clearDraft(set, kind))}
          disabled={!draft}
        >
          <RotateCcw /> Reset
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => withUndo("Tier list cleared.", () => change({}))}
          disabled={ranked(rows) === 0}
        >
          <Eraser /> Clear
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={ranked(rows) === 0}>
              <Share2 /> Share <ChevronDown className="opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={copyLink}>
              <Link2 /> Copy link
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={copyListImage}>
              <Copy /> Copy image
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={saveListImage}>
              <ImageDown /> Save as image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" onClick={() => setExporting(true)}>
          <FileCode /> Export to site
        </Button>
      </div>

      <div className="space-y-4">
        <MakerBoard entries={source.entries} byKey={source.byKey} rows={rows} onChange={change} />
      </div>
      <ExportDialog open={exporting} onOpenChange={setExporting} kind={kind} rows={rows} source={source} />
    </>
  );
}
