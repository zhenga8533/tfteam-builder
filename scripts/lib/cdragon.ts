export const CDRAGON_BASE = "https://raw.communitydragon.org";

export interface RawItem {
  apiName: string;
  name: string | null;
  desc: string | null;
  icon: string | null;
  composition: string[];
  effects: Record<string, number | null>;
  associatedTraits: string[];
  unique: boolean;
}

export interface RawChampion {
  apiName: string;
  name: string | null;
  cost: number;
  traits: string[];
  squareIcon: string | null;
  tileIcon: string | null;
  /** The wide TFT splash; a hash like `{94230c60604bffc1}` when the path couldn't be resolved. */
  icon: string | null;
  /** Combat role such as "APCaster" or "ADTank" (Set 13 on); missing for some sets. */
  role: string | null;
  ability: {
    name: string | null;
    desc: string | null;
    icon: string | null;
    variables: { name: string; value: (number | null)[] | null }[];
  };
  stats: Record<string, number | null>;
}

export interface RawTrait {
  apiName: string;
  name: string;
  desc: string | null;
  icon: string | null;
  effects: {
    /** Null for traits that are active from a single unit (e.g. mechanic traits). */
    minUnits: number | null;
    maxUnits: number | null;
    style: number;
    variables: Record<string, number | null>;
  }[];
}

export interface RawSet {
  number: number;
  mutator: string;
  name: string;
  champions: RawChampion[];
  traits: RawTrait[];
  items: string[];
  augments: string[];
}

export interface RawTftData {
  items: RawItem[];
  setData: RawSet[];
}

export interface RawPlannerChampion {
  character_id: string;
  team_planner_code: number;
  squareIconPath: string;
  squareSplashIconPath: string;
}

export type RawTeamPlanner = Record<string, RawPlannerChampion[]>;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
  return (await response.json()) as T;
}

export const fetchVersion = (patch: string) =>
  fetchJson<{ version: string }>(`${CDRAGON_BASE}/${patch}/content-metadata.json`).then(({ version }) => version);

/** `16.19.8230722+branch...` → `16.19` */
export const patchLabel = (version: string) => version.split(".").slice(0, 2).join(".");

export const fetchTftData = (patch: string) => fetchJson<RawTftData>(`${CDRAGON_BASE}/${patch}/cdragon/tft/en_us.json`);

export const fetchTeamPlanner = (patch: string) =>
  fetchJson<RawTeamPlanner>(
    `${CDRAGON_BASE}/${patch}/plugins/rcp-be-lol-game-data/global/default/v1/tftchampions-teamplanner.json`,
  );
