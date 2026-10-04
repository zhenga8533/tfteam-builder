import {
  ChevronDown,
  Copy,
  ClipboardCopy,
  ClipboardPaste,
  Eraser,
  NotebookPen,
  FolderOpen,
  ImageDown,
  Link2,
  Save,
  Share2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
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
import type { GuideDetails } from "@/content/serialize";
import { guideFromComp } from "@/features/comps/guide-from-comp";
import { useActiveSet, useGameData } from "@/lib/data/hooks";
import { autoCompsQuery } from "@/lib/data/queries";
import { cn } from "@/lib/utils";
import { imageFileName } from "@/lib/canvas";
import { copyImage, copyText, saveImage, siteUrl } from "@/lib/share";
import { boardTitle, renderBoardImage } from "../board-image";
import { encodeShareCode } from "../share-link";
import { encodeTeamCode, supportsTeamCodes } from "../team-code";
import { useBoardSummary, useBuilder } from "../use-builder";
import { GuideEditorDialog } from "./guide-editor-dialog";
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

function MenuHeading({ children }: { children: string }) {
  return <DropdownMenuLabel className="text-xs text-muted-foreground">{children}</DropdownMenuLabel>;
}

type Panel = "import" | "save" | "saved" | "guide" | null;

interface GuideStart {
  /** Remounts the editor when a different comp seeds it. */
  key: string;
  initial?: Partial<GuideDetails>;
}

/** The detected comp a "Write a guide" link names in the URL, once its comps have loaded. */
function useGuideFromSearch(): GuideStart | undefined {
  const { patch } = useActiveSet();
  const { guide } = useSearch({ from: "/builder" });
  const { set } = useBuilder();
  const comps = useQuery({ ...autoCompsQuery(patch, set), enabled: Boolean(guide) }).data?.comps;
  const comp = guide ? comps?.find((entry) => entry.id === guide) : undefined;
  return comp && { key: comp.id, initial: guideFromComp(comp) };
}

export function TeamToolbar() {
  const { champions, championsByApi, itemsByApi } = useGameData();
  const { set, board, boards, level, clear, setBoard } = useBuilder();
  const { units, traits, cost } = useBoardSummary();
  const [panel, setPanel] = useState<Panel>(null);
  const navigate = useNavigate({ from: "/builder" });
  const fromSearch = useGuideFromSearch();
  const [guideStart, setGuideStart] = useState<GuideStart>({ key: "blank" });
  const codesSupported = supportsTeamCodes(champions);
  const flexUnits = units.filter((unit) => unit.flex).length;
  const coreUnits = units.length - flexUnits;

  const copyLink = () =>
    copyText(siteUrl("builder", { team: encodeShareCode(set, boards) }), "Team link copied.", { showOnFailure: true });

  const copyCode = () =>
    copyText(
      encodeTeamCode(
        units.map((unit) => unit.apiName),
        champions,
        set,
      ),
      "Team code copied. Paste it into the in-game Team Planner.",
      { showOnFailure: true },
    );

  const imageTitle = () => boardTitle(units, traits, championsByApi) ?? `Level ${level} board`;
  const boardImage = () =>
    renderBoardImage({
      title: imageTitle(),
      subtitle: `Set ${set} · Level ${level} · ${coreUnits} units${flexUnits ? ` + ${flexUnits} flex` : ""} · ${cost} gold`,
      board,
      traits,
      championsByApi,
      itemsByApi,
    });

  const copyBoardImage = () => copyImage(boardImage(), "Board image copied.");
  const saveBoardImage = () => saveImage(boardImage, imageFileName(imageTitle()));

  const clearBoard = () => {
    const previous = board;
    clear();
    toast("Board cleared.", { action: { label: "Undo", onClick: () => setBoard(previous) } });
  };

  const panelProps = (name: Exclude<Panel, null>) => ({
    open: panel === name,
    onOpenChange: (open: boolean) => setPanel(open ? name : null),
  });

  // A guide link opens the editor once; closing it keeps that comp's draft and drops the link's parameter.
  const guideProps = {
    open: panel === "guide" || Boolean(fromSearch),
    onOpenChange: (open: boolean) => {
      if (fromSearch) {
        setGuideStart(fromSearch);
        void navigate({ search: (previous) => ({ ...previous, guide: undefined }), replace: true });
      }
      setPanel(open ? "guide" : null);
    },
  };
  const editorStart = fromSearch ?? guideStart;

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
          <MenuHeading>Share this team</MenuHeading>
          <DropdownMenuItem onSelect={copyLink} disabled={units.length === 0}>
            <Link2 />
            <MenuText title="Copy link" hint="Opens this team, every level included, in the Team Builder" />
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={copyBoardImage} disabled={units.length === 0}>
            <Copy />
            <MenuText title="Copy image" hint="This board and its traits, to paste into Discord or a post" />
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={saveBoardImage} disabled={units.length === 0}>
            <ImageDown />
            <MenuText title="Save as image" hint="Download the same image as a PNG" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <MenuHeading>In-game Team Planner</MenuHeading>
          <DropdownMenuItem onSelect={copyCode} disabled={!codesSupported || units.length === 0}>
            <ClipboardCopy />
            <MenuText title="Copy team code" hint="The first 10 champions on the board" />
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPanel("import")} disabled={!codesSupported}>
            <ClipboardPaste />
            <MenuText
              title="Import team code"
              hint={codesSupported ? "Paste a code from the Team Planner" : "Not available for this set"}
            />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <MenuHeading>Comp guide</MenuHeading>
          <DropdownMenuItem onSelect={() => setPanel("guide")} disabled={units.length === 0}>
            <NotebookPen />
            <MenuText title="Write a comp guide" hint="Fill in the details and get the guide's file" />
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
      <GuideEditorDialog key={editorStart.key} initial={editorStart.initial} {...guideProps} />
    </div>
  );
}
