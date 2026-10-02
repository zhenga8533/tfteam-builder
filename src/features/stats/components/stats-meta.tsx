import { Activity, ChevronDown, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RANK_FLOORS } from "@/lib/data/constants";
import type { RankFloor, SetStats } from "@/lib/data/schema";
import { LOW_SAMPLE_GAMES } from "@/lib/game/stat-line";
import { count, RANK_FLOOR_LABEL, timeAgo } from "../format";

export interface RankChoice {
  /** Floors with stats, highest first. */
  floors: RankFloor[];
  /** The default floor; choosing it clears the choice. */
  base: RankFloor;
  onChange: (rank: RankFloor | undefined) => void;
}

/** The rank floor in the stats sentence, as a menu when other floors have stats (tier lists only). */
function RankLabel({ floor, choice }: { floor: RankFloor; choice?: RankChoice }) {
  if (!choice || choice.floors.length < 2) return <>{RANK_FLOOR_LABEL[floor]}</>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex translate-y-[-1px] items-center gap-1 rounded-md border bg-card px-1.5 py-px align-middle text-xs font-medium text-foreground shadow-xs transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent"
        aria-label={`Rank: ${RANK_FLOOR_LABEL[floor]}`}
      >
        {RANK_FLOOR_LABEL[floor]}
        <ChevronDown className="size-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={floor}
          onValueChange={(value) => choice.onChange(value === choice.base ? undefined : (value as RankFloor))}
        >
          {choice.floors.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {RANK_FLOOR_LABEL[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Where the numbers come from, plus notes when the data is thinner than usual. */
export function StatsMeta({ stats, rank }: { stats: SetStats; rank?: RankChoice }) {
  if (stats.status === "collecting") {
    return (
      <p className="mb-6 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
        <Activity className="size-4 shrink-0 text-primary" />
        Collecting match data for Set {stats.set}: {count(stats.matches)} ranked games so far. Stats appear once there
        are enough games.
      </p>
    );
  }

  const notes = [
    stats.previousPatch &&
      `The latest patch is too new to have enough games yet, so these stats are from patch ${stats.patch}.`,
    // Only a fallback below the usual floor needs explaining; Master+ is a floor users pick.
    RANK_FLOORS.indexOf(stats.rankFloor as (typeof RANK_FLOORS)[number]) > 0 &&
      `Early in the set, few players have reached Diamond, so this includes ${RANK_FLOOR_LABEL[stats.rankFloor]} games.`,
  ].filter(Boolean);

  return (
    <div className="mb-6 space-y-2">
      <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="About these stats"
              className="mt-0.5 shrink-0 rounded-full hover:text-foreground"
            >
              <Info className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-72">
            Ranked games from every server, collected every few hours from Riot's match API. Placements are averaged per
            board; entries with fewer than {LOW_SAMPLE_GAMES} games are marked low sample.
          </TooltipContent>
        </Tooltip>
        <span>
          Based on <span className="font-medium text-foreground">{count(stats.matches)}</span>{" "}
          <RankLabel floor={stats.rankFloor} choice={rank} /> ranked games on patch {stats.patch} ·{" "}
          <time dateTime={stats.updatedAt} title={new Date(stats.updatedAt).toLocaleString()}>
            Updated {timeAgo(stats.updatedAt)}
          </time>
        </span>
      </p>
      {notes.map((note) => (
        <p key={note as string} className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {note}
        </p>
      ))}
    </div>
  );
}
