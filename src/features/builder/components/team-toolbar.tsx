import { ClipboardCopy, ClipboardPaste, Eraser, FileCode, FolderOpen, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatIcon } from "@/components/game/stat-icon";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGameData } from "@/lib/data/hooks";
import { encodeTeamCode, supportsTeamCodes } from "../team-code";
import { useBoardSummary, useBuilder } from "../use-builder";
import { ExportCompDialog } from "./export-comp-dialog";
import { SavedTeamsSheet, SaveTeamDialog } from "./saved-teams";
import { ImportTeamCodeDialog } from "./team-code-dialog";

type Panel = "import" | "save" | "saved" | "export" | null;

export function TeamToolbar() {
  const { champions } = useGameData();
  const { set, board, clear, load } = useBuilder();
  const { units, cost } = useBoardSummary();
  const [panel, setPanel] = useState<Panel>(null);
  const codesSupported = supportsTeamCodes(champions);

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
    toast("Board cleared.", { action: { label: "Undo", onClick: () => load(previous) } });
  };

  const panelProps = (name: Exclude<Panel, null>) => ({
    open: panel === name,
    onOpenChange: (open: boolean) => setPanel(open ? name : null),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="mr-auto flex items-center gap-4 text-sm">
        <span>
          <span className="font-semibold tabular-nums">{units.length}</span>{" "}
          <span className="text-muted-foreground">units</span>
        </span>
        <span className="flex items-center gap-1" title="Total gold value">
          <StatIcon stat="gold" />
          <span className="font-semibold tabular-nums">{cost}</span>
        </span>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="outline" size="sm" onClick={() => setPanel("import")} disabled={!codesSupported}>
              <ClipboardPaste /> Import
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {codesSupported ? "Import an in-game Team Planner code" : "Team codes aren't available for this set"}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="outline" size="sm" onClick={copyCode} disabled={!codesSupported || units.length === 0}>
              <ClipboardCopy /> Copy code
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Copy an in-game Team Planner code (first 10 champions)</TooltipContent>
      </Tooltip>
      <Button variant="outline" size="sm" onClick={() => setPanel("saved")}>
        <FolderOpen /> Saved
      </Button>
      <Button variant="outline" size="sm" onClick={() => setPanel("save")} disabled={units.length === 0}>
        <Save /> Save
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="outline" size="sm" onClick={() => setPanel("export")} disabled={units.length === 0}>
              <FileCode /> Export
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Export the board as a comp guide file for the tier list</TooltipContent>
      </Tooltip>
      <Button variant="ghost" size="sm" onClick={clearBoard} disabled={units.length === 0}>
        <Eraser /> Clear
      </Button>

      <ImportTeamCodeDialog {...panelProps("import")} />
      <SaveTeamDialog {...panelProps("save")} />
      <SavedTeamsSheet {...panelProps("saved")} />
      <ExportCompDialog {...panelProps("export")} />
    </div>
  );
}
