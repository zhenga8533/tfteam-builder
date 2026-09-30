import { Activity, Info } from "lucide-react";
import type { SetStats } from "@/lib/data/schema";
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
      <p className="text-sm text-muted-foreground">
        {count(stats.matches)} ranked games · {RANK_FLOOR_LABEL[stats.rankFloor]} · Patch {stats.patch} · updated{" "}
        {timeAgo(stats.updatedAt)}
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
