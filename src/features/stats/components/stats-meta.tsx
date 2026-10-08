import { Activity, ChevronDown, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
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
  onChange: (region: Region | undefined) => void;
}

export interface PatchChoice {
  onChange: (patch: string | undefined) => void;
}

/** A link-styled button inside a note. */
function NoteAction({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="font-medium text-primary underline-offset-2 hover:underline">
      {children}
    </button>
  );
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

/** The patch in the stats sentence, as a menu when other patches have tier list stats. */
function PatchLabel({ shown, base, choice }: { shown: string; base: SetStats | null; choice?: PatchChoice }) {
  if (!choice || !base?.patches?.length) return <>{shown}</>;
  const newest = base.newestPatch;
  const options: ChipOption[] = base.patches.map((value) =>
    value === newest?.patch
      ? { value, label: value, hint: `Early: ${count(newest.matches)} matches so far` }
      : { value, label: value, hint: "Final stats" },
  );
  // Other patches come newest first; the default stats sit after the newest patch's early ones.
  const at = options[0]?.value === newest?.patch ? 1 : 0;
  options.splice(at, 0, { value: base.patch, label: base.patch, hint: "Current stats" });
  return (
    <ChoiceChip
      name="Patch"
      label={shown}
      value={shown}
      options={options}
      onChange={(value) => choice.onChange(value === base.patch ? undefined : value)}
    />
  );
}

/**
 * Where the numbers come from, plus notes when the data is thinner than usual. With `onRankChange` or `region`, the
 * rank floor and region become menus of the ones that have their own stats; with `patch`, so does the patch: the newest
 * one early, while the default stats fall back to the previous one, and earlier ones.
 */
export function StatsMeta({
  stats,
  onRankChange,
  region,
  patch,
}: {
  stats: SetStats;
  onRankChange?: (rank: RankFloor | undefined) => void;
  region?: RegionChoice;
  patch?: PatchChoice;
}) {
  const base = useStats();
  if (stats.status === "collecting") {
    return (
      <p className="mb-6 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
        <Activity className="size-4 shrink-0 text-primary" />
        Collecting match data for Set {stats.set}: {count(stats.matches)} ranked matches so far. Stats appear once there
        are enough games.
      </p>
    );
  }

  const newest = base?.newestPatch;
  const offered = base?.patches ?? [];
  // Another patch's stats: the newest patch's early ones, or an earlier patch's final ones.
  const otherPatch = base && stats.patch !== base.patch ? stats.patch : undefined;
  const early = otherPatch !== undefined && otherPatch === newest?.patch;
  const past = otherPatch !== undefined && !early;
  // Final stats (a finished set's, or an earlier patch's) don't get older, so their age isn't a warning sign.
  const stale = !stats.frozen && !past && isStale(stats.updatedAt);
  const backToCurrent = patch && base && (
    <>
      {" "}
      <NoteAction onClick={() => patch.onChange(undefined)}>Back to patch {base.patch}</NoteAction>
    </>
  );
  const notes: [key: string, note: ReactNode][] = [];
  if (early) {
    notes.push([
      "early",
      <>
        Patch {otherPatch} is new, with only {count(stats.matches)} matches so far, so these tiers can still change a
        lot.{backToCurrent}
      </>,
    ]);
  } else if (past) {
    notes.push(["past", <>Showing an earlier patch.{backToCurrent}</>]);
  } else if (stats.previousPatch) {
    notes.push([
      "previous",
      newest ? (
        <>
          Patch {newest.patch} has only {count(newest.matches)} {RANK_FLOOR_LABEL[stats.rankFloor]} matches so far, too
          few to rank reliably, so these stats are from patch {stats.patch}.
          {patch && offered.includes(newest.patch) && (
            <>
              {" "}
              <NoteAction onClick={() => patch.onChange(newest.patch)}>See patch {newest.patch} anyway</NoteAction>
            </>
          )}
        </>
      ) : (
        `The latest patch is too new to have enough games yet, so these stats are from patch ${stats.patch}.`
      ),
    ]);
  }
  // Only the automatic fallback below the usual floor needs explaining, not a lower floor someone picked.
  if (stats.rankFloor === base?.rankFloor && RANK_FLOORS.indexOf(stats.rankFloor as (typeof RANK_FLOORS)[number]) > 0) {
    notes.push([
      "floor",
      `Early in the set, few players have reached Diamond, so this includes ${RANK_FLOOR_LABEL[stats.rankFloor]} games.`,
    ]);
  }

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
            hours from Riot's match API. Each player in a match counts as one game; entries with fewer than{" "}
            {LOW_SAMPLE_GAMES} games are marked low sample.
          </TooltipContent>
        </Tooltip>
        <span>
          Based on <span className="font-medium text-foreground">{count(stats.matches * BOARDS_PER_MATCH)}</span>{" "}
          <RankLabel floor={stats.rankFloor} base={base} onChange={onRankChange} /> ranked games ({count(stats.matches)}{" "}
          matches)
          <RegionLabel region={stats.region} regions={base?.regions} choice={region} /> on patch{" "}
          <PatchLabel shown={stats.patch} base={base} choice={patch} /> ·{" "}
          {stats.frozen ? (
            `Final stats for Set ${stats.set}`
          ) : past ? (
            "Final stats for this patch"
          ) : (
            <time
              dateTime={stats.updatedAt}
              title={new Date(stats.updatedAt).toLocaleString()}
              className={cn(stale && "font-medium text-placement-worse")}
            >
              Updated {timeAgo(stats.updatedAt)}
            </time>
          )}
        </span>
      </p>
      {stale && (
        <p className="flex items-start gap-2 text-xs text-placement-worse">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          No new games have come in for over a day, so these stats may be behind; match collection may be paused.
        </p>
      )}
      {/* Indented to line up with the sentence above, past its info button. */}
      {notes.map(([key, note]) => (
        <p key={key} className="pl-5.5 text-xs text-muted-foreground">
          {note}
        </p>
      ))}
    </div>
  );
}
