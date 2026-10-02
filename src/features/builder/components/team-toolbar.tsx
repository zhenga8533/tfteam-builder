import {
  ChevronDown,
  ClipboardCopy,
  ClipboardPaste,
  Eraser,
  FileCode,
  FolderOpen,
  ImageDown,
  Link2,
  Save,
  Share2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatIcon } from "@/components/game/stat-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGameData } from "@/lib/data/hooks";
import { cn } from "@/lib/utils";
import { imageFileName, renderBoardImage } from "../board-image";
import { encodeShareCode } from "../share-link";
import { encodeTeamCode, supportsTeamCodes } from "../team-code";
import { useBoardSummary, useBuilder } from "../use-builder";
import { ExportCompDialog } from "./export-comp-dialog";
import { SavedTeamsSheet, SaveTeamDialog } from "./saved-teams";
import { ImportTeamCodeDialog } from "./team-code-dialog";

function MenuText({ title, hint }: { title: string; hint: string }) {
  return (
    <span className="flex flex-col">
      <span>{title}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </span>
  );
}

type Panel = "import" | "save" | "saved" | "export" | null;

export function TeamToolbar() {
  const { champions, championsByApi, itemsByApi } = useGameData();
  const { set, board, boards, level, clear, setBoard } = useBuilder();
  const { units, traits, cost } = useBoardSummary();
  const [panel, setPanel] = useState<Panel>(null);
  const codesSupported = supportsTeamCodes(champions);
  const flexUnits = units.filter((unit) => unit.flex).length;
  const coreUnits = units.length - flexUnits;

  const copyLink = async () => {
    const url = new URL(`${import.meta.env.BASE_URL}builder`, location.origin);
    url.searchParams.set("team", encodeShareCode(set, boards));
    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success("Team link copied.");
    } catch {
      toast.error("Couldn't access the clipboard.", { description: url.toString() });
    }
  };

  const copyCode = async () => {
    const code = encodeTeamCode(
      units.map((unit) => unit.apiName),
      champions,
      set,
    );
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Team code copied. Paste it into the in-game Team Planner.");
    } catch {
      toast.error("Couldn't access the clipboard.", { description: code });
    }
  };

  const saveImage = async () => {
    const title = `Set ${set} · Level ${level}`;
    try {
      const blob = await renderBoardImage({
        title,
        subtitle: `${coreUnits} units${flexUnits ? ` + ${flexUnits} flex` : ""} · ${cost} gold`,
        board,
        traits,
        championsByApi,
        itemsByApi,
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = imageFileName(title);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      toast.error("Couldn't create the image.", { description: error instanceof Error ? error.message : undefined });
    }
  };

  const clearBoard = () => {
    const previous = board;
    clear();
    toast("Board cleared.", { action: { label: "Undo", onClick: () => setBoard(previous) } });
  };

  const panelProps = (name: Exclude<Panel, null>) => ({
    open: panel === name,
    onOpenChange: (open: boolean) => setPanel(open ? name : null),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="mr-auto flex items-center gap-4 text-sm">
        <span title={`Level ${level} fields up to ${level} units`}>
          <span className={cn("font-semibold tabular-nums", coreUnits > level && "text-destructive")}>
            {coreUnits}/{level}
          </span>{" "}
          <span className="text-muted-foreground">units</span>
          {flexUnits > 0 && <span className="text-muted-foreground"> · {flexUnits} flex</span>}
        </span>
        <span className="flex items-center gap-1" title="Total gold value">
          <StatIcon stat="gold" />
          <span className="font-semibold tabular-nums">{cost}</span>
        </span>
      </div>

      <Button variant="outline" size="sm" onClick={() => setPanel("save")} disabled={units.length === 0}>
        <Save /> Save
      </Button>
      <Button variant="outline" size="sm" onClick={() => setPanel("saved")}>
        <FolderOpen /> Saved
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Share2 /> Share <ChevronDown className="opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem onSelect={copyLink} disabled={units.length === 0}>
            <Link2 />
            <MenuText title="Copy link" hint="Opens this team, every level included, in the Team Builder" />
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={saveImage} disabled={units.length === 0}>
            <ImageDown />
            <MenuText title="Save as image" hint="A PNG of this board and its traits, for sharing anywhere" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">In-game Team Planner</DropdownMenuLabel>
          <DropdownMenuItem onSelect={copyCode} disabled={!codesSupported || units.length === 0}>
            <ClipboardCopy />
            <MenuText title="Copy team code" hint="First 10 champions, for the in-game Team Planner" />
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPanel("import")} disabled={!codesSupported}>
            <ClipboardPaste />
            <MenuText
              title="Import team code"
              hint={codesSupported ? "Paste a code from the Team Planner" : "Not available for this set"}
            />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setPanel("export")} disabled={units.length === 0}>
            <FileCode />
            <MenuText title="Export as comp file" hint="For a comp guide on the tier list" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={clearBoard}
              disabled={units.length === 0}
              aria-label="Clear board"
            >
              <Eraser />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Clear board</TooltipContent>
      </Tooltip>

      <ImportTeamCodeDialog {...panelProps("import")} />
      <SaveTeamDialog {...panelProps("save")} />
      <SavedTeamsSheet {...panelProps("saved")} />
      <ExportCompDialog {...panelProps("export")} />
    </div>
  );
}
