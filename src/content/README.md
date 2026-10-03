# Content

Comp guides and tier lists are typed TypeScript modules. They're picked up automatically, with no registry to update.

```
comps/set{N}/{slug}.ts   one comp per file (default export, `satisfies Comp`)
tierlists/set{N}.ts      tier overrides and the augment tier list for a set (`satisfies TierList`)
```

## Tier lists

Champion, item and trait tiers are generated from match stats (see the README's Match Stats section). The rows in
`tierlists/set{N}.ts` override individual tiers. A listed entry moves to that tier, and everything else keeps its
generated tier. Overridden entries carry a pin on the tier list, so visitors can tell them from stats-based tiers:

```ts
champions: { S: ["DA_18_Ahri"] },
items: { A: ["TFT_Item_BlueBuff"], X: ["TFT_Item_ThiefsGloves"] },
traits: { S: ["DA_18_Blossom:5"] }, // trait apiName and breakpoint (minimum units)
```

`fallback` holds whole hand-written champion, item or trait tier lists for when there are no match stats (before
crawling starts, or on PBE). Once stats exist it's ignored, so a stopgap list can't keep overriding real data:

```ts
fallback: { items: { S: ["TFT_Item_JeweledGauntlet"], A: ["TFT_Item_BlueBuff"] } },
```

Augments aren't in Riot's match data, so `augments` is always the complete, hand-written augment tier list.

The easiest way to edit any of these is **Tools → Tier List Maker**: arrange the list by dragging, then **Export to
site**. For a stats-based list it writes only the overrides needed (entries placed away from their stats tier), or
the whole list as the fallback; it keeps the file's other sections and can open the change on GitHub.

## Adding a comp

1. Build the board in the Team Builder, then choose **Share → Write a comp guide**. Or start from a detected comp:
   **Write a guide** on its page loads its board and fills in the name, carries, tier and a playstyle.
   With more than one level board, the highest becomes `board` and the lowest `early`.
2. Fill in the tier, playstyle, difficulty, summary, carries, augments and tips. Optional slots (`flex: true`) and
   `alternatives` come from the board.
3. **Submit on GitHub** opens GitHub's new-file page with the formatted file in `comps/set{N}/`, ready to propose as a
   pull request. Or download or copy it, save it there and run `npm test`. The file is already formatted, so
   `npm run format` has nothing to change.

References use the `apiName` values from the generated game data, e.g. `DA_18_Ahri` or `TFT_Item_BlueBuff`.
The Champions, Items and Augments pages show each entry's name, and `public/data/latest/set{N}.json` contains the apiNames.

## Validation

`content.test.ts` checks every comp and tier list against the live-patch data. It fails if a champion (including an
alternative), item or augment no longer exists, if a hex is reused or out of range, or if a slug is duplicated. CI runs it on every push,
so a patch that renames something will flag the guides that need updating.
