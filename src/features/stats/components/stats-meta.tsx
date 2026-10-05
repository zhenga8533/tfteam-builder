import { Activity, ChevronDown, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BOARDS_PER_MATCH, isStale, RANK_FLOORS, RANK_OPTIONS, type Region } from "@/lib/data/constants";
import { useStats } from "@/lib/data/hooks";
import type { RankFloor, SetStats } from "@/lib/data/schema";
import { LOW_SAMPLE_GAMES } from "@/lib/game/stat-line";
import { cn } from "@/lib/utils";
import { count, RANK_FLOOR_LABEL, REGION_LABEL, timeAgo } from "../format";

export interface RegionChoice {
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
function RankLabel({
  floor,
  base,
  onChange,
}: {
  floor: RankFloor;
  base: SetStats | null;
  onChange?: (rank: RankFloor | undefined) => void;
}) {
  const available = base?.ranks?.length ? [base.rankFloor, ...base.ranks] : [];
  const floors = RANK_OPTIONS.filter((option) => available.includes(option));
  if (!onChange || !base || floors.length < 2) return <>{RANK_FLOOR_LABEL[floor]}</>;
  return (
    <ChoiceChip
      name="Rank"
      label={RANK_FLOOR_LABEL[floor]}
      value={floor}
      options={floors.map((option) => ({ value: option, label: RANK_FLOOR_LABEL[option] }))}
      onChange={(value) => onChange(value === base.rankFloor ? undefined : (value as RankFloor))}
    />
  );
}

/** "from all regions" / "in Asia", as a menu when regions have their own stats. */
function RegionLabel({ region, regions, choice }: { region?: Region; regions?: Region[]; choice?: RegionChoice }) {
  if (!choice || !regions?.length) return region ? <> in {REGION_LABEL[region].name}</> : null;
  return (
    <>
      {region ? " in " : " from "}
      <ChoiceChip
        name="Region"
        label={region ? REGION_LABEL[region].name : "all regions"}
        value={region ?? ALL_REGIONS}
        options={[
          { value: ALL_REGIONS, label: "All regions" },
          ...regions.map((option) => ({
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

/**
 * Where the numbers come from, plus notes when the data is thinner than usual. With `onRankChange` or `region`, the
 * rank floor and region become menus of the ones that have their own stats.
 */
export function StatsMeta({
  stats,
  onRankChange,
  region,
}: {
  stats: SetStats;
  onRankChange?: (rank: RankFloor | undefined) => void;
  region?: RegionChoice;
}) {
  const defaultStats = useStats();
  if (stats.status === "collecting") {
    return (
      <p className="mb-6 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
        <Activity className="size-4 shrink-0 text-primary" />
        Collecting match data for Set {stats.set}: {count(stats.matches)} ranked matches so far. Stats appear once there
        are enough games.
      </p>
    );
  }

  const stale = isStale(stats.updatedAt);
  const notes = [
    stale && "No new games have come in for over a day, so these stats may be behind; match collection may be paused.",
    stats.previousPatch &&
      `The latest patch is too new to have enough games yet, so these stats are from patch ${stats.patch}.`,
    // Only the automatic fallback below the usual floor needs explaining, not a lower floor someone picked.
    stats.rankFloor === defaultStats?.rankFloor &&
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
            Ranked games from {stats.region ? REGION_LABEL[stats.region].servers : "every server"}, collected every few
            hours from Riot's match API. Placements are averaged per board; entries with fewer than {LOW_SAMPLE_GAMES}{" "}
            games are marked low sample.
          </TooltipContent>
        </Tooltip>
        <span>
          Based on <span className="font-medium text-foreground">{count(stats.matches)}</span>{" "}
          <RankLabel floor={stats.rankFloor} base={defaultStats} onChange={onRankChange} /> ranked matches (
          {count(stats.matches * BOARDS_PER_MATCH)} boards)
          <RegionLabel region={stats.region} regions={defaultStats?.regions} choice={region} /> on patch {stats.patch} ·{" "}
          <time
            dateTime={stats.updatedAt}
            title={new Date(stats.updatedAt).toLocaleString()}
            className={cn(stale && "font-medium text-placement-worse")}
          >
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
