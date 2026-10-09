# Game data

`npm run data` (`scripts/build-data.ts`) turns CommunityDragon's TFT export (about 24 MB per patch) into small per-set
files the site loads one at a time. It runs on every deploy and skips a patch whose client version hasn't changed
(`npm run data:force` rebuilds anyway).

## What it produces

- `public/data/manifest.json`: the live and PBE patches, each with its client version, its label (the TFT patch name
  from Riot's notes, e.g. 18.4b) and the sets it has, newest first.
- `public/data/{latest,pbe}/set{N}.json`: one file per mainline set, validated with Zod.

## Per set

- **Champions**: shop champions with their abilities, stats, traits, cost and team planner code. Forms that never
  appear in the shop (e.g. Lux (Coven)) are found by name and listed as champions of their own.
- **Traits**: every trait, including ones granted by augments or set mechanics, with breakpoints and styles.
- **Items**, classified into kinds:
  - components, completed items, emblems, radiants, artifacts;
  - **set items**: the set's own mechanic items (Set 18's potions). An item counts when it's drawn in the set's own
    icon folder (`icons/tft{N}/`) and is neither another kind nor tagged as a consumable.

  Duplicates (CommunityDragon often lists an item twice) are merged, keeping the richer entry, and the others become
  aliases, so match data naming either one resolves.

- **Augments** with their tiers, read from icon file names.
- **Shop odds and champion pool**, from Riot's map data, for Roll Odds.

## Set items are confirmed by match data

Some items drawn in a set's folder are rewards or tokens no one holds (Set 14's "50 Rerolls"). So after the stats are
built, each set's live game data keeps only the set items its published stats show held, and drops the rest. A new
set's mechanic items appear on their own once they're played. The PBE has no stats, so its candidates aren't
confirmed.

## Older sets

The live client keeps older sets' data, so the site can show them, but Riot stops maintaining it: art shrinks to 256 px
and data can drift. When a set is frozen (see [Match stats](match-stats.md#finished-sets)), its game data is archived
with its stats and used instead of the client's copy from then on. In the set switcher, older sets always show live
data, labelled with the patch their stats come from.
