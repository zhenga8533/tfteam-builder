import { type Board, createBoard } from "@/lib/game/board";
import { type Comp, type CompUnit, type Tier, TIERS, type TierList } from "./types";

const compModules = import.meta.glob<Comp>("./comps/**/*.ts", { eager: true, import: "default" });
const tierListModules = import.meta.glob<TierList>("./tierlists/*.ts", { eager: true, import: "default" });

export const ALL_COMPS: Comp[] = Object.values(compModules);
export const ALL_TIER_LISTS: TierList[] = Object.values(tierListModules);

const tierRank = (tier: Tier) => TIERS.indexOf(tier);

export const compsForSet = (set: number) =>
  ALL_COMPS.filter((comp) => comp.set === set).sort(
    (a, b) => tierRank(a.tier) - tierRank(b.tier) || a.name.localeCompare(b.name),
  );

export const findComp = (slug: string) => ALL_COMPS.find((comp) => comp.slug === slug);

export const tierListForSet = (set: number) => ALL_TIER_LISTS.find((list) => list.set === set);

export function compBoard(units: CompUnit[]): Board {
  const board = createBoard();
  for (const unit of units) {
    board[unit.hex] = {
      apiName: unit.apiName,
      star: unit.star ?? 1,
      items: unit.items ?? [],
      ...(unit.flex && { flex: true }),
      ...(unit.alternatives?.length && { alternatives: unit.alternatives }),
    };
  }
  return board;
}
