import { Activity, ChevronDown, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RANK_FLOORS, type Region } from "@/lib/data/constants";
import type { RankFloor, SetStats } from "@/lib/data/schema";
import { LOW_SAMPLE_GAMES } from "@/lib/game/stat-line";
import { count, RANK_FLOOR_LABEL, REGION_LABEL, timeAgo } from "../format";

export interface RankChoice {
  /** Floors with stats, highest first. */
  floors: RankFloor[];
  /** The default floor; choosing it clears the choice. */
  base: RankFloor;
  onChange: (rank: RankFloor | undefined) => void;
}

export interface RegionChoice {
  /** Regions with stats. */
  regions: Region[];
  value?: Region;
  onChange: (region: Region | undefined) => void;
}

interface ChipOption {
  value: string;
  label: string;
  hint?: string;
}

/** A menu inside the stats sentence, shown as a small chip with the current choice. */
function ChoiceChip({
  label,
  value,
  options,
  onChange,
  name,
}: {
  label: string;
  value: string;
  options: ChipOption[];
  onChange: (value: string) => void;
  /** What the chip chooses, for screen readers ("Rank", "Region"). */
  name: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex translate-y-[-1px] items-center gap-1 rounded-md border bg-card px-1.5 py-px align-middle text-xs font-medium text-foreground shadow-xs transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent"
        aria-label={`${name}: ${label}`}
      >
        {label}
        <ChevronDown className="size-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="flex-col items-start gap-0">
              <span>{option.label}</span>
              {option.hint && <span className="text-xs text-muted-foreground">{option.hint}</span>}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const ALL_REGIONS = "all";

/** The rank floor in the stats sentence, as a menu when other floors have stats. */
function RankLabel({ floor, choice }: { floor: RankFloor; choice?: RankChoice }) {
  if (!choice || choice.floors.length < 2) return <>{RANK_FLOOR_LABEL[floor]}</>;
  return (
    <ChoiceChip
      name="Rank"
      label={RANK_FLOOR_LABEL[floor]}
      value={floor}
      options={choice.floors.map((option) => ({ value: option, label: RANK_FLOOR_LABEL[option] }))}
      onChange={(value) => choice.onChange(value === choice.base ? undefined : (value as RankFloor))}
    />
  );
}

/** "from all regions" / "in Asia", as a menu when regions have their own stats. */
function RegionLabel({ region, choice }: { region?: Region; choice?: RegionChoice }) {
  if (!choice?.regions.length) return region ? <> in {REGION_LABEL[region].name}</> : null;
  return (
    <>
      {region ? " in " : " from "}
      <ChoiceChip
        name="Region"
        label={region ? REGION_LABEL[region].name : "all regions"}
        value={region ?? ALL_REGIONS}
        options={[
          { value: ALL_REGIONS, label: "All regions" },
          ...choice.regions.map((option) => ({
            value: option,
            label: REGION_LABEL[option].name,
            hint: REGION_LABEL[option].servers,
          })),
        ]}
        onChange={(value) => choice.onChange(value === ALL_REGIONS ? undefined : (value as Region))}
      />
    </>
  );
}

/** Where the numbers come from, plus notes when the data is thinner than usual. */
export function StatsMeta({ stats, rank, region }: { stats: SetStats; rank?: RankChoice; region?: RegionChoice }) {
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
          <RankLabel floor={stats.rankFloor} choice={rank} /> ranked games
          <RegionLabel region={stats.region} choice={region} /> on patch {stats.patch} ·{" "}
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
