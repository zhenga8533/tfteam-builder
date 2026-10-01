import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ClipboardCopy,
  ClipboardPaste,
  Eraser,
  FileCode,
  FolderOpen,
  Save,
  Share2,
  WandSparkles,
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
import { useActiveSet, useGameData } from "@/lib/data/hooks";
import { statsQuery } from "@/lib/data/queries";
import type { Champion } from "@/lib/data/schema";
import { cn } from "@/lib/utils";
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
  const { champions } = useGameData();
  const { set, board, level, clear, setBoard, autofill } = useBuilder();
  const { patch } = useActiveSet();
  // Not suspending: autofill works without stats, it just breaks ties by cost instead of placement.
  const stats = useQuery(statsQuery(patch, set)).data;
  const { units, cost } = useBoardSummary();
  const [panel, setPanel] = useState<Panel>(null);
  const codesSupported = supportsTeamCodes(champions);
  const flexUnits = units.filter((unit) => unit.flex).length;
  const coreUnits = units.length - flexUnits;

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

  const clearBoard = () => {
    const previous = board;
    clear();
    toast("Board cleared.", { action: { label: "Undo", onClick: () => setBoard(previous) } });
  };

  const fill = () => {
    const previous = board;
    const strength = stats
      ? (champion: Champion) => {
          const line = stats.units[champion.apiName];
          return line ? 4.5 - line.score : 0;
        }
      : undefined;
    const added = autofill(strength);
    if (added.length === 0) return;
    toast(`Added ${added.map((champion) => champion.name).join(", ")}.`, {
      action: { label: "Undo", onClick: () => setBoard(previous) },
    });
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

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={fill} disabled={coreUnits >= level}>
            <WandSparkles /> Autofill
          </Button>
        </TooltipTrigger>
        <TooltipContent>Fill the board to level {level} with the units that activate the most traits</TooltipContent>
      </Tooltip>
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
