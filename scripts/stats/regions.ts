export type RegionalHost = "americas" | "europe" | "asia" | "sea";

export interface Platform {
  /** Platform routing value, also the lowercase prefix of its match IDs (e.g. `na1` → `NA1_…`). */
  id: string;
  /** Match-v1 is served from regional hosts; league-v1 from the platform host. */
  region: RegionalHost;
  /** Target size of the crawled player pool; smaller servers have fewer high-ranked players. */
  poolSize: number;
}

export const PLATFORMS: Platform[] = [
  { id: "na1", region: "americas", poolSize: 1000 },
  { id: "br1", region: "americas", poolSize: 500 },
  { id: "la1", region: "americas", poolSize: 300 },
  { id: "la2", region: "americas", poolSize: 300 },
  { id: "euw1", region: "europe", poolSize: 1000 },
  { id: "eun1", region: "europe", poolSize: 500 },
  { id: "tr1", region: "europe", poolSize: 300 },
  { id: "ru", region: "europe", poolSize: 300 },
  { id: "me1", region: "europe", poolSize: 200 },
  { id: "kr", region: "asia", poolSize: 1000 },
  { id: "jp1", region: "asia", poolSize: 300 },
  { id: "oc1", region: "sea", poolSize: 300 },
  { id: "sg2", region: "sea", poolSize: 500 },
  { id: "tw2", region: "sea", poolSize: 500 },
  { id: "vn2", region: "sea", poolSize: 500 },
];

export const REGIONAL_HOSTS: RegionalHost[] = ["americas", "europe", "asia", "sea"];

export function selectPlatforms(ids: string[] | undefined): Platform[] {
  if (!ids?.length) return PLATFORMS;
  const selected = PLATFORMS.filter((platform) => ids.includes(platform.id));
  const unknown = ids.filter((id) => !PLATFORMS.some((platform) => platform.id === id));
  if (unknown.length) throw new Error(`Unknown platform(s): ${unknown.join(", ")}`);
  return selected;
}
