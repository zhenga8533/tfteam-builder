import { Activity, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SetStats } from "@/lib/data/schema";
import { LOW_SAMPLE_GAMES } from "@/lib/game/stat-line";
import { count, RANK_FLOOR_LABEL, timeAgo } from "../format";

/** Where the numbers come from, plus notes when the data is thinner than usual. */
export function StatsMeta({ stats }: { stats: SetStats }) {
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
    stats.rankFloor !== "diamond" &&
      `Early in the set, few players have reached Diamond, so this includes ${RANK_FLOOR_LABEL[stats.rankFloor]} games.`,
  ].filter(Boolean);

  return (
    <div className="mb-6 space-y-2">
      <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="About these stats" className="rounded-full hover:text-foreground">
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
          {RANK_FLOOR_LABEL[stats.rankFloor]} ranked games on patch {stats.patch}
        </span>
        <span aria-hidden>·</span>
        <time dateTime={stats.updatedAt} title={new Date(stats.updatedAt).toLocaleString()}>
          Updated {timeAgo(stats.updatedAt)}
        </time>
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
