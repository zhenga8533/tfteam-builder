# Content

Comp guides and tier lists are typed TypeScript modules. They're picked up automatically, with no registry to update.

```
comps/set{N}/{slug}.ts   one comp per file (default export, `satisfies Comp`)
tierlists/set{N}.ts      tier overrides and the augment tier list for a set (`satisfies TierList`)
```

## Tier lists

Champion, item and trait tiers are generated from match stats (see the README's Match Stats section). The rows in
`tierlists/set{N}.ts` override individual tiers. A listed entry moves to that tier, and everything else keeps its
generated tier:

```ts
champions: { S: ["DA_18_Ahri"] },
items: { A: ["TFT_Item_BlueBuff"], X: ["TFT_Item_ThiefsGloves"] },
traits: { S: ["DA_18_Blossom:5"] }, // trait apiName and breakpoint (minimum units)
```

When no stats are published (for example before crawling is enabled), the item rows are the whole item tier list.
Augments aren't in Riot's match data, so `augments` is always the complete, hand-written augment tier list.

## Adding a comp

1. Build the board in the Team Builder, then click **Export** and download or copy the file.
2. Save it under `comps/set{N}/`, then fill in `tier`, `playstyle`, `difficulty`, `summary`, `augments` and `tips`.
   Mark the main carries with `carry: true`.
3. Run `npm run format` and `npm test`.

References use the `apiName` values from the generated game data, e.g. `DA_18_Ahri` or `TFT_Item_BlueBuff`.
The Champions, Items and Augments pages show each entry's name, and `public/data/latest/set{N}.json` contains the apiNames.

## Validation

`content.test.ts` checks every comp and tier list against the live-patch data. It fails if a champion, item or
augment no longer exists, if a hex is reused or out of range, or if a slug is duplicated. CI runs it on every push,
so a patch that renames something will flag the guides that need updating.
