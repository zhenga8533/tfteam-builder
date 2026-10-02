import type { RankFloor } from "@/lib/data/schema";

export const RANK_FLOOR_LABEL: Record<RankFloor, string> = {
  master: "Master+",
  diamond: "Diamond+",
  emerald: "Emerald+",
  platinum: "Platinum+",
  gold: "Gold+",
};

/** Average placement is centred on 4.5; color how far an entry sits from it. */
export function avgPlacementClass(avg: number) {
  if (avg <= 4.1) return "text-cost-2";
  if (avg <= 4.4) return "text-tier-c";
  if (avg <= 4.6) return "text-foreground";
  if (avg <= 4.9) return "text-tier-a";
  return "text-destructive";
}

export const percent = (value: number) => `${Math.round(value * 100)}%`;

export const count = (value: number) => value.toLocaleString("en-US");

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.round((Date.parse(iso) - now) / 60_000);
  if (Math.abs(minutes) < 60) return RELATIVE.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return RELATIVE.format(hours, "hour");
  return RELATIVE.format(Math.round(hours / 24), "day");
}
