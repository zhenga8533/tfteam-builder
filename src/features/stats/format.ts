import type { Region } from "@/lib/data/constants";
import type { RankFloor } from "@/lib/data/schema";

/** Short names for the chip, and the servers each routing region covers for its menu. */
export const REGION_LABEL: Record<Region, { name: string; servers: string }> = {
  americas: { name: "Americas", servers: "NA, BR, LAN, LAS" },
  europe: { name: "Europe", servers: "EUW, EUNE, TR, RU, ME" },
  asia: { name: "Asia", servers: "KR, JP" },
  sea: { name: "SEA", servers: "OCE, SG, TW, VN" },
};

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
  if (avg <= 4.4) return "text-placement-better";
  if (avg <= 4.6) return "text-foreground";
  if (avg <= 4.9) return "text-placement-worse";
  return "text-destructive";
}

export const percent = (value: number, digits = 0) => `${Math.round(value * 10 ** (digits + 2)) / 10 ** digits}%`;

/** A share that's often small (a play rate): one decimal place under 10%, and "<0.1%" below that. */
export const share = (value: number) => (value < 0.001 ? "<0.1%" : value < 0.1 ? percent(value, 1) : percent(value));

export const count = (value: number) => value.toLocaleString("en-US");

/** What a champion's play rates are a share of, e.g. "Ahri's games". */
export const championGames = (name: string | undefined) => `${name ?? "this champion"}'s games`;

/** An average placement, to two decimals. */
export const placement = (avg: number) => avg.toFixed(2);

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.round((Date.parse(iso) - now) / 60_000);
  if (Math.abs(minutes) < 60) return RELATIVE.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return RELATIVE.format(hours, "hour");
  return RELATIVE.format(Math.round(hours / 24), "day");
}

/**
 * Movement in average placement smaller than this isn't shown, however many games back it: the stats build already
 * leaves out changes within chance, and this keeps out real but negligible ones.
 */
export const MIN_TREND = 0.05;
