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

/** CDragon writes the string "None" for missing asset paths in older sets. */
const presentPath = (path: string | null | undefined) => (path && path !== "None" ? path : undefined);
/** 32-bit FNV-1a of the lowercased name: how Riot's game data hashes field names, rendered as `{xxxxxxxx}`. */
export function binHash(name: string): string {
  let hash = 0x811c9dc5;
  for (const char of name.toLowerCase()) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return `{${(hash >>> 0).toString(16).padStart(8, "0")}}`;
}

/**
 * Some sets export variables under hashed keys (e.g. `{0f90e7a4}`) while descriptions still use names
 * (`@StonebarkTreeBonusHealth@`). Renames every hashed key whose name appears in `desc`.
 */
export function unhashVariables(record: Record<string, number | null>, desc: string | null): Record<string, number> {
  const names = new Map(
    [...(desc ?? "").matchAll(/@([A-Za-z0-9_]+)(?:\*[\d.]+)?@/g)].map(([, name]) => [binHash(name!), name!]),
  );
  return Object.fromEntries(
    Object.entries(cleanNumbers(record)).map(([key, value]) => [names.get(key.toLowerCase()) ?? key, value]),
  );
}

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

/** Upper bound CDragon uses for open-ended breakpoints; also substituted when it reports none. */
const UNBOUNDED_UNITS = 25000;

/**
 * Champions reference traits by display name, but several traits can share one: Set 17 has
 * `TFT17_Stargazer` plus per-constellation `TFT17_Stargazer_Wolf` etc. The champion-facing trait is
 * the one whose apiName prefixes the others, else the shortest; the rest are tracked as variants.
 */
export function championTraitApiNames(traits: RawTrait[], championTraitNames: Set<string>): Set<string> {
  const byName = Map.groupBy(
    traits.filter((trait) => championTraitNames.has(trait.name)),
    (trait) => trait.name,
  );
  return new Set(
    [...byName.values()].map((group) => {
      const names = group.map((trait) => trait.apiName).sort((a, b) => a.length - b.length || a.localeCompare(b));
      return names.find((name) => names.every((other) => other.startsWith(name))) ?? names[0]!;
    }),
  );
}

/**
 * Keeps every trait in the set, since match data reports augment- and mechanic-granted ones too.
 * `championApiNames` marks those carried by shop champions (or their forms).
 */
function buildTraits(set: RawSet, patch: string, championApiNames: Set<string>): Trait[] {
  return set.traits
    .map((trait: RawTrait) => ({
      apiName: trait.apiName,
      name: trait.name,
      desc: trait.desc ?? "",
      icon: gameAssetUrl(patch, trait.icon),
      breakpoints: trait.effects.map((effect) => ({
        minUnits: effect.minUnits ?? 1,
        maxUnits: effect.maxUnits ?? UNBOUNDED_UNITS,
        style: effect.style,
        variables: unhashVariables(effect.variables, trait.desc),
      })),
      source: championApiNames.has(trait.apiName) ? ("champion" as const) : ("other" as const),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const ROLE_DAMAGE: Record<string, string> = { AP: "Magic", AD: "Attack", H: "Hybrid" };
const ROLE_KIND: Record<string, string> = {
  Tank: "Tank",
  Fighter: "Fighter",
  Caster: "Caster",
  Carry: "Marksman",
  Reaper: "Assassin",
  Specialist: "Specialist",
};
const ROLE_CODE = new RegExp(`^(AP|AD|H)(${Object.keys(ROLE_KIND).join("|")})`);

/** "APCaster" → "Magic Caster", "ADCarryCrit" → "Attack Marksman"; the in-game role names. */
export function championRole(code: string | null): string | undefined {
  const match = code?.match(ROLE_CODE);
  return match ? `${ROLE_DAMAGE[match[1]!]} ${ROLE_KIND[match[2]!]}` : undefined;
}

function buildChampion(
  raw: RawChampion,
  patch: string,
  traitApiByName: Map<string, string>,
  planner?: RawPlannerChampion,
  formOf?: string,
): Champion {
  const stat = (key: string) => raw.stats[key] ?? 0;
  return {
    apiName: raw.apiName,
    name: raw.name ?? raw.apiName,
    cost: raw.cost,
    traits: raw.traits.flatMap((name) => traitApiByName.get(name) ?? []),
    icon: planner
      ? pluginAssetUrl(patch, planner.squareIconPath)
      : gameAssetUrl(patch, presentPath(raw.tileIcon) ?? raw.squareIcon),
    splash: raw.icon && !raw.icon.startsWith("{") ? gameAssetUrl(patch, raw.icon) : "",
    role: championRole(raw.role),
    plannerCode: planner?.team_planner_code,
    ...(formOf && { formOf }),
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
  // Older sets have no team planner data, so fall back to "has traits and a shop cost", minus forms.
  const candidates = set.champions.filter(
    (champion) => champion.traits.length > 0 && champion.cost >= 1 && champion.cost <= 5 && champion.name,
  );
  const names = new Set(candidates.map((champion) => champion.name));
  return candidates
    .filter((champion) => !names.has(formBaseName(champion.name ?? "") ?? ""))
    .map((raw) => ({ raw, planner: undefined }));
}

const FORM_NAME = /^(.+?)\s*\((.+)\)$/;

/** "Lux (Coven)" → "Lux"; null when the name has no form suffix. */
const formBaseName = (name: string) => name.match(FORM_NAME)?.[1] ?? null;

/**
 * Alternate forms appear in games but not in the shop: traited champions outside the shop list whose
 * name is a shop champion's, optionally with a "(Form)" suffix (e.g. "Lux (Coven)", or a same-named clone).
 */
function findForms(set: RawSet, shop: RawChampion[]): Map<string, { raw: RawChampion; label: string | null }[]> {
  const shopIds = new Set(shop.map((champion) => champion.apiName));
  const shopByName = new Map(shop.map((champion) => [champion.name, champion.apiName]));
  const forms = new Map<string, { raw: RawChampion; label: string | null }[]>();
  for (const raw of set.champions) {
    if (shopIds.has(raw.apiName) || raw.traits.length === 0 || !raw.name) continue;
    const match = raw.name.match(FORM_NAME);
    const base = shopByName.get(match?.[1] ?? raw.name);
    if (!base) continue;
    forms.set(base, [...(forms.get(base) ?? []), { raw, label: match?.[2] ?? null }]);
  }
  return forms;
}

/**
 * Classifies a set's item pool. The same completed item can appear under several apiNames
 * (e.g. `TFT_Item_InfinityEdge` and a set-specific `DA_InfinityEdge`). Set-specific entries are sometimes
 * empty stubs, so the one with a description wins, then the set-specific one. `aliases` maps every
 * discarded duplicate to the kept apiName, since match data may reference either.
 */
export function buildItems(
  set: RawSet,
  itemsByApi: Map<string, RawItem>,
  patch: string,
): { items: Item[]; aliases: Record<string, string> } {
  const pool = set.items.flatMap((apiName) => {
    const item = itemsByApi.get(apiName);
    return item && isDisplayable(item.name) ? [item as RawItem & { name: string }] : [];
  });

  const chosen = new Map<string, { raw: RawItem & { name: string }; kind: ItemKind }>();
  const candidates = new Map<string, string[]>();
  const richness = (item: RawItem) => (item.desc ? 2 : 0) + (item.apiName.startsWith("TFT_Item_") ? 0 : 1);
  const add = (raw: RawItem & { name: string }, kind: ItemKind) => {
    const key = `${kind}:${normalizeName(raw.name)}`;
    candidates.set(key, [...(candidates.get(key) ?? []), raw.apiName]);
    const existing = chosen.get(key);
    if (!existing || richness(raw) > richness(existing.raw)) {
      chosen.set(key, { raw, kind });
    }
  };

  for (const item of pool) {
    if (item.composition.length === 2) add(item, item.name.endsWith("Emblem") ? "emblem" : "completed");
  }

  const componentApiNames = new Set(pool.flatMap((item) => (item.composition.length === 2 ? item.composition : [])));
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

  const aliases: Record<string, string> = Object.fromEntries(
    [...chosen.entries()].flatMap(([key, { raw }]) =>
      (candidates.get(key) ?? []).filter((apiName) => apiName !== raw.apiName).map((apiName) => [apiName, raw.apiName]),
    ),
  );
  // Variants that weren't classified at all (e.g. augment-granted emblems) still count as the item of the same name.
  const keptByName = new Map([...chosen.values()].map(({ raw }) => [normalizeName(raw.name), raw.apiName]));
  for (const item of pool) {
    const target = keptByName.get(normalizeName(item.name));
    if (target && target !== item.apiName && !aliases[item.apiName]) aliases[item.apiName] = target;
  }

  const items = [...chosen.values()]
    .map(({ raw, kind }) => ({
      apiName: raw.apiName,
      name: raw.name,
      desc: raw.desc ?? "",
      icon: gameAssetUrl(patch, raw.icon),
      kind,
      composition: raw.composition,
      effects: unhashVariables(raw.effects, raw.desc),
      unique: raw.unique,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { items, aliases };
}

/**
 * Augments are often listed twice under the same name and tier: a set-specific stub without effect
 * values and the real entry. Keep the one with the most resolved effects.
 */
export function buildAugments(set: RawSet, itemsByApi: Map<string, RawItem>, patch: string): Augment[] {
  const chosen = new Map<string, Augment>();
  for (const augment of set.augments.flatMap((apiName) => {
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
        effects: unhashVariables(raw.effects, raw.desc),
        associatedTraits: raw.associatedTraits,
      },
    ];
  })) {
    const key = `${augment.tier}:${normalizeName(augment.name)}`;
    const existing = chosen.get(key);
    if (!existing || Object.keys(augment.effects).length > Object.keys(existing.effects).length) {
      chosen.set(key, augment);
    }
  }
  return [...chosen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function buildSet(
  set: RawSet,
  itemsByApi: Map<string, RawItem>,
  teamPlanner: RawTeamPlanner,
  patch: string,
): SetData {
  const selected = selectChampions(set, teamPlanner[set.mutator]);
  const forms = findForms(
    set,
    selected.map(({ raw }) => raw),
  );
  const formRaws = [...forms.values()].flat().map(({ raw }) => raw);
  const championTraitNames = new Set([...selected.map(({ raw }) => raw), ...formRaws].flatMap((raw) => raw.traits));
  const traits = buildTraits(set, patch, championTraitApiNames(set.traits, championTraitNames));
  // Champions reference traits by display name, and mechanic traits can reuse a name, so only champion traits resolve.
  const traitApiByName = new Map(
    traits.filter((trait) => trait.source === "champion").map((trait) => [trait.name, trait.apiName]),
  );
  // Named forms ("Lux (Coven)") bring different traits, so each is a champion of its own; unnamed
  // same-name clones are the same unit and count as their base.
  const formEntries = [...forms].flatMap(([base, list]) => list.map((form) => ({ base, ...form })));
  const namedForms = formEntries.filter((form) => form.label !== null);
  const { items: pool, aliases } = buildItems(set, itemsByApi, patch);
  const items = pool.flatMap((item) => {
    if (item.kind !== "emblem") return [item];
    // Emblems carry no trait reference in CDragon, and some belong to traits that aren't in this set.
    const traitName = item.name.replace(/ Emblem$/, "");
    const trait = traitApiByName.get(traitName);
    if (!trait) return [];
    // Some sets only ship emblem stubs without text; every emblem does the same thing in-game.
    const desc = item.desc || `The holder gains the <TFTKeyword>${traitName}</TFTKeyword> trait.`;
    return [{ ...item, trait, desc }];
  });
  const kept = new Set(items.map((item) => item.apiName));

  return {
    number: set.number,
    name: `Set ${set.number}`,
    champions: weightFormTraits(
      [
        ...selected.map(({ raw, planner }) => buildChampion(raw, patch, traitApiByName, planner)),
        ...namedForms.map(({ raw, base }) => buildChampion(raw, patch, traitApiByName, undefined, base)),
      ],
      traits,
    ).sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)),
    traits,
    // Recipes can name set-specific component variants (DA_Component_Spatula) that alias to the kept ones.
    items: items.map((item) => ({ ...item, composition: item.composition.map((part) => aliases[part] ?? part) })),
    itemAliases: Object.fromEntries(Object.entries(aliases).filter(([, target]) => kept.has(target))),
    championAliases: Object.fromEntries(
      formEntries.filter((form) => form.label === null).map(({ raw, base }) => [raw.apiName, base]),
    ),
    augments: buildAugments(set, itemsByApi, patch),
  };
}

const COUNTED_TWICE = /counted twice/i;

/**
 * Some form mechanics count the chosen trait double (Set 18's Avatar: "An Avatar's chosen Trait is counted
 * twice"). When a base champion's own trait says so, each form's added trait gets a weight of 2.
 */
export function weightFormTraits(champions: Champion[], traits: Trait[]): Champion[] {
  const byApi = new Map(champions.map((champion) => [champion.apiName, champion]));
  const doubling = new Set(traits.filter((trait) => COUNTED_TWICE.test(trait.desc)).map((trait) => trait.apiName));
  return champions.map((champion) => {
    const base = champion.formOf ? byApi.get(champion.formOf) : undefined;
    if (!base?.traits.some((trait) => doubling.has(trait))) return champion;
    const added = champion.traits.filter((trait) => !base.traits.includes(trait));
    return added.length ? { ...champion, traitCounts: Object.fromEntries(added.map((trait) => [trait, 2])) } : champion;
  });
}

/** Every mainline set entry (e.g. `TFTSet18`), newest first, excluding PvE/Pairs/Turbo variants. */
export function mainlineSets(sets: RawSet[]): RawSet[] {
  return sets.filter((set) => set.mutator === `TFTSet${set.number}`).sort((a, b) => b.number - a.number);
}
