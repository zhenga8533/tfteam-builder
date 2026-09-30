import type { Augment, AugmentTier, Champion, Item, ItemKind, SetData, Trait } from "../../src/lib/data/schema.ts";
import {
  CDRAGON_BASE,
  type RawChampion,
  type RawItem,
  type RawPlannerChampion,
  type RawSet,
  type RawTeamPlanner,
  type RawTrait,
} from "./cdragon.ts";

/** Converts a game asset path (e.g. `ASSETS/Foo/Bar.tex`) into its CommunityDragon PNG URL. */
export function gameAssetUrl(patch: string, path: string | null | undefined): string {
  if (!path || path === "None") return "";
  const png = path.toLowerCase().replace(/\.(tex|dds|jpg|png)$/, ".png");
  return `${CDRAGON_BASE}/${patch}/game/${png}`;
}

/** Converts a client plugin path (`/lol-game-data/assets/ASSETS/...`) into its CommunityDragon PNG URL. */
export function pluginAssetUrl(patch: string, path: string | null | undefined): string {
  if (!path) return "";
  const relative = path.replace(/^\/lol-game-data\/assets\//i, "").toLowerCase();
  const png = relative.replace(/\.(jpg|png|tex|dds)$/, ".png");
  return `${CDRAGON_BASE}/${patch}/plugins/rcp-be-lol-game-data/global/default/${png}`;
}

const cleanNumbers = (record: Record<string, number | null>) =>
  Object.fromEntries(Object.entries(record).filter((entry): entry is [string, number] => entry[1] !== null));

const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

const isDisplayable = (name: string | null): name is string => !!name && !/[_@{}]/.test(name);

/** Augment tiers are only encoded in icon filenames, e.g. `foo_ii.tex`, `foo-iii.tex` or `foo3.tex`. */
export function parseAugmentTier(icon: string | null): AugmentTier | null {
  const file = icon?.toLowerCase().replace(/\.[a-z]+$/, "") ?? "";
  const numeral = file.match(/[_-](i{1,3})$/)?.[1];
  if (numeral) return numeral.length as AugmentTier;
  const digit = file.match(/([1-3])$/)?.[1];
  return digit ? (Number(digit) as AugmentTier) : null;
}

function buildTraits(set: RawSet, patch: string, usedNames: Set<string>): Trait[] {
  return set.traits
    .filter((trait) => usedNames.has(trait.name))
    .map((trait: RawTrait) => ({
      apiName: trait.apiName,
      name: trait.name,
      desc: trait.desc ?? "",
      icon: gameAssetUrl(patch, trait.icon),
      breakpoints: trait.effects.map((effect) => ({
        minUnits: effect.minUnits,
        maxUnits: effect.maxUnits,
        style: effect.style,
        variables: cleanNumbers(effect.variables),
      })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildChampion(
  raw: RawChampion,
  patch: string,
  traitApiByName: Map<string, string>,
  planner?: RawPlannerChampion,
): Champion {
  const stat = (key: string) => raw.stats[key] ?? 0;
  return {
    apiName: raw.apiName,
    name: raw.name ?? raw.apiName,
    cost: raw.cost,
    traits: raw.traits.flatMap((name) => traitApiByName.get(name) ?? []),
    icon: planner ? pluginAssetUrl(patch, planner.squareIconPath) : gameAssetUrl(patch, raw.tileIcon ?? raw.squareIcon),
    splash: planner ? pluginAssetUrl(patch, planner.squareSplashIconPath) : gameAssetUrl(patch, raw.squareIcon),
    plannerCode: planner?.team_planner_code,
    ability: {
      name: raw.ability.name ?? "",
      desc: raw.ability.desc ?? "",
      icon: gameAssetUrl(patch, raw.ability.icon),
      variables: Object.fromEntries(
        raw.ability.variables.map((variable) => [variable.name, (variable.value ?? []).map((value) => value ?? 0)]),
      ),
    },
    stats: {
      hp: stat("hp"),
      mana: stat("mana"),
      initialMana: stat("initialMana"),
      damage: stat("damage"),
      attackSpeed: stat("attackSpeed"),
      armor: stat("armor"),
      magicResist: stat("magicResist"),
      critChance: stat("critChance"),
      critMultiplier: stat("critMultiplier"),
      range: stat("range"),
    },
  };
}

function selectChampions(set: RawSet, planner: RawPlannerChampion[] | undefined) {
  if (planner) {
    const byId = new Map(planner.map((champion) => [champion.character_id, champion]));
    return set.champions
      .filter((champion) => byId.has(champion.apiName))
      .map((raw) => ({ raw, planner: byId.get(raw.apiName) }));
  }
  // Older sets have no team planner data, so fall back to "has traits and a shop cost".
  return set.champions
    .filter((champion) => champion.traits.length > 0 && champion.cost >= 1 && champion.cost <= 5 && champion.name)
    .map((raw) => ({ raw, planner: undefined }));
}

/**
 * Classifies a set's item pool. The same completed item can appear under several apiNames
 * (e.g. `TFT_Item_InfinityEdge` and a set-specific `DA_InfinityEdge`); the set-specific one wins.
 */
export function buildItems(set: RawSet, itemsByApi: Map<string, RawItem>, patch: string): Item[] {
  const pool = set.items.flatMap((apiName) => {
    const item = itemsByApi.get(apiName);
    return item && isDisplayable(item.name) ? [item as RawItem & { name: string }] : [];
  });

  const chosen = new Map<string, { raw: RawItem & { name: string }; kind: ItemKind }>();
  const add = (raw: RawItem & { name: string }, kind: ItemKind) => {
    const key = `${kind}:${normalizeName(raw.name)}`;
    const existing = chosen.get(key);
    if (!existing || (existing.raw.apiName.startsWith("TFT_Item_") && !raw.apiName.startsWith("TFT_Item_"))) {
      chosen.set(key, { raw, kind });
    }
  };

  for (const item of pool) {
    if (item.composition.length === 2) add(item, item.name.endsWith("Emblem") ? "emblem" : "completed");
  }

  const componentApiNames = new Set([...chosen.values()].flatMap(({ raw }) => raw.composition));
  const completedNames = new Set(
    [...chosen.values()].filter(({ kind }) => kind === "completed").map(({ raw }) => normalizeName(raw.name)),
  );
  // Anvils and generic "Artifact Item"/"Radiant Item" entries are loot placeholders, not equippable items.
  const isPlaceholder = (item: RawItem & { name: string }) =>
    /anvil/i.test(item.name) || /^(artifact|radiant) item$/i.test(item.name) || !item.icon?.includes("item");

  for (const item of pool) {
    if (item.composition.length === 2) continue;
    if (componentApiNames.has(item.apiName)) add(item, "component");
    else if (item.name.startsWith("Radiant ")) {
      if (completedNames.has(normalizeName(item.name.slice("Radiant ".length)))) add(item, "radiant");
    } else if (/artifact|ornn/i.test(`${item.apiName} ${item.icon}`)) {
      if (!isPlaceholder(item)) add(item, "artifact");
    } else if (item.name.endsWith("Emblem") && !/augment/i.test(item.apiName)) add(item, "emblem");
  }

  return [...chosen.values()]
    .map(({ raw, kind }) => ({
      apiName: raw.apiName,
      name: raw.name,
      desc: raw.desc ?? "",
      icon: gameAssetUrl(patch, raw.icon),
      kind,
      composition: raw.composition,
      effects: cleanNumbers(raw.effects),
      unique: raw.unique,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function buildAugments(set: RawSet, itemsByApi: Map<string, RawItem>, patch: string): Augment[] {
  return set.augments
    .flatMap((apiName) => {
      const raw = itemsByApi.get(apiName);
      const tier = parseAugmentTier(raw?.icon ?? null);
      if (!raw || !isDisplayable(raw.name) || tier === null) return [];
      return [
        {
          apiName: raw.apiName,
          name: raw.name,
          desc: raw.desc ?? "",
          icon: gameAssetUrl(patch, raw.icon),
          tier,
          effects: cleanNumbers(raw.effects),
          associatedTraits: raw.associatedTraits,
        },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function buildSet(
  set: RawSet,
  itemsByApi: Map<string, RawItem>,
  teamPlanner: RawTeamPlanner,
  patch: string,
): SetData {
  const selected = selectChampions(set, teamPlanner[set.mutator]);
  const usedTraitNames = new Set(selected.flatMap(({ raw }) => raw.traits));
  const traits = buildTraits(set, patch, usedTraitNames);
  const traitApiByName = new Map(traits.map((trait) => [trait.name, trait.apiName]));

  return {
    number: set.number,
    name: `Set ${set.number}`,
    champions: selected
      .map(({ raw, planner }) => buildChampion(raw, patch, traitApiByName, planner))
      .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)),
    traits,
    items: buildItems(set, itemsByApi, patch),
    augments: buildAugments(set, itemsByApi, patch),
  };
}

/** The mainline set entries (e.g. `TFTSet18`), newest first, excluding PvE/Pairs/Turbo variants. */
export function mainlineSets(sets: RawSet[], limit: number): RawSet[] {
  return sets
    .filter((set) => set.mutator === `TFTSet${set.number}`)
    .sort((a, b) => b.number - a.number)
    .slice(0, limit);
}
