import type { SetData } from "../../src/lib/data/schema.ts";
import type { BoardRow } from "../store/types.ts";
import { resolversFor } from "./stats.ts";

interface FormChoice {
  apiName: string;
  /** The trait this form adds on top of its base champion's, e.g. Coven for "Lux (Coven)". */
  trait: string;
}

/**
 * Match data reports a champion with forms by its base name ("DA_Lux18_Base") almost every time, so the
 * form a player picked is read from the board's trait counts instead: the chosen form's trait counts more
 * units than the rest of the board explains (Avatar forms count twice). Rows are rewritten to the form's
 * apiName, or left alone when the counts don't single one out.
 */
export class FormInference {
  private readonly resolve: ReturnType<typeof resolversFor>;
  private readonly forms = new Map<string, FormChoice[]>();
  private readonly championTraits: Map<string, string[]>;
  private readonly emblemTraits: Map<string, string>;

  constructor(data: SetData) {
    this.resolve = resolversFor(data);
    this.championTraits = new Map(data.champions.map((champion) => [champion.apiName, champion.traits]));
    this.emblemTraits = new Map(data.items.flatMap((item) => (item.trait ? [[item.apiName, item.trait]] : [])));
    for (const champion of data.champions) {
      if (!champion.formOf) continue;
      const base = this.championTraits.get(champion.formOf) ?? [];
      const trait = champion.traits.find((apiName) => !base.includes(apiName));
      if (trait)
        this.forms.set(champion.formOf, [
          ...(this.forms.get(champion.formOf) ?? []),
          { apiName: champion.apiName, trait },
        ]);
    }
  }

  row(row: BoardRow): BoardRow {
    if (this.forms.size === 0) return row;
    const [, , , , , rawUnits, rawTraits] = row;
    const names = rawUnits.map(([unit]) => this.resolve.units.resolve(unit, 0));
    const bases = new Set(names.filter((name): name is string => name !== undefined && this.forms.has(name)));
    if (bases.size === 0) return row;

    const reported = new Map<string, number>();
    for (const [trait, , count] of rawTraits) {
      const apiName = this.resolve.traits.resolve(trait, 0);
      if (apiName) reported.set(apiName, count);
    }
    const explained = this.explainedCounts(row, names, bases);

    const chosen = new Map<string, string>();
    for (const base of bases) {
      const candidates = this.forms
        .get(base)!
        .map((form) => ({ form, extra: (reported.get(form.trait) ?? 0) - (explained.get(form.trait) ?? 0) }))
        .filter(({ extra }) => extra > 0)
        .sort((a, b) => b.extra - a.extra);
      const [best, runnerUp] = candidates;
      if (best && (!runnerUp || best.extra > runnerUp.extra)) chosen.set(base, best.form.apiName);
    }
    if (chosen.size === 0) return row;

    const units = rawUnits.map((unit, index) => {
      const form = chosen.get(names[index] ?? "");
      return form ? ([form, unit[1], unit[2]] as const) : unit;
    });
    const rewritten = [...row] as BoardRow;
    rewritten[5] = units as BoardRow[5];
    return rewritten;
  }

  /** Trait counts from every unit except the champions whose form is in question, plus emblems. */
  private explainedCounts(row: BoardRow, names: (string | undefined)[], bases: Set<string>) {
    const counts = new Map<string, number>();
    const add = (trait: string) => counts.set(trait, (counts.get(trait) ?? 0) + 1);
    const counted = new Set<string>();
    row[5].forEach(([, , rawItems], index) => {
      const name = names[index];
      if (!name || bases.has(name)) return;
      const own = this.championTraits.get(name) ?? [];
      if (!counted.has(name)) {
        counted.add(name);
        own.forEach(add);
      }
      const granted = new Set(
        rawItems.flatMap((item) => this.emblemTraits.get(this.resolve.items.resolve(item, 0) ?? "") ?? []),
      );
      for (const trait of granted) if (!own.includes(trait)) add(trait);
    });
    return counts;
  }
}
