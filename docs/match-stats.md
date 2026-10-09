# Match stats

Tier lists, stats pages, comps, Patch Changes, the Explorer and the builder's best items all come from ranked games
collected through the [Riot Games API](https://developer.riotgames.com/). Riot's match data doesn't include augments,
so the augment tier list and comp guides stay hand-written.

## Crawling

`npm run crawl` (`scripts/crawl.ts`), every 3 hours in the **Crawl** workflow:

1. **A player pool per server.** Each pool is split between tiers: 40% Master+, 35% Diamond and 25% Emerald, so every
   rank floor gets games of its own. Space a tier can't fill passes down, reaching Platinum and Gold only early in a
   set. Pools are reseeded from the ladder daily.
2. **New ranked games.** For each player it fetches standard ranked games since their last check (a new player's first
   check looks back 6 hours). A match counts toward the tier of the player it was found through, and each match is
   only processed once.
3. **Each game's patch**, from Riot's patch notes (see [Patches](#patches)), since match data has no version.
4. **Stores every player's final board** in R2, as one gzipped chunk per set, patch and region per run.
5. **Prunes** boards older than each set's two newest patches.

Each run's summary on its Actions page shows players checked, games kept per tier and the pools' make-up.

Options for running it by hand: `--platforms na1,euw1`, `--max-matches 200`, `--budget-minutes 45` (the default),
`--state <dir>` to store locally instead of R2, and `--dry-run`.

## Patches

Match data reports no version (`TFT Unreal Version ?.?.?.?`), so each game is placed in a patch by its start time
against a timeline read from [Riot's patch notes](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/).

- **Full patches** (18.4): the article list gives each patch's publish time, always 18:00 UTC. A patch goes live
  24 hours later.
- **Mid-patch updates** (18.4b, 18.1d): each article's "Mid-Patch Update(s)" section lists dated updates.
  - They're lettered the way Riot counts them: each update is the next letter, so 18.1's third update is 18.1d, unless
    the notes name one ("18.4 B-Patch").
  - Only updates with a balance change (a `⇒` line) start a patch. Bug and performance fixes stay part of the patch
    before, so a few days of fixes don't split off on their own.
  - The notes give only a date, so an update is taken to go out at 18:00 UTC that day.
- **Re-reading:** each crawl re-reads every article of the current set (and at least the three newest). The stored
  timeline replaces a re-read patch's entries as a whole, so a letter the notes no longer support doesn't linger.
- **Re-checking:** each stats build re-checks every stored game's patch against the newest timeline, so games crawled
  before a mid-patch update was announced move to it.
- **Replaced on release day:** a patch whose b patch is dated its own release day (18.4 and 18.4b) has no time of its
  own. Its saved stats are ignored, and boards filed under it count as the replacing patch's when pruning.
- **Uncertain hours:** games within 3 hours either side of a patch change are left out of the stats, since rollouts
  vary by region and the hour is an estimate. They stay stored. A set's first patch isn't a change.

## Building the stats

`npm run stats` (`scripts/build-stats.ts`), on every deploy:

- **Which games are shown:** the newest patch at Diamond+ with at least 2,000 matches. Otherwise the previous patch of
  the set; early in a new set, lower rank floors instead. The stats line on each page says which patch and floor.
- **Tiers:** pages show each entry's real average placement. Tiers and "best" orderings rank by that average pulled
  toward 4.5 when there are few games, so a handful of lucky games can't top a list. The top 10% are S, the next 25%
  A, the next 35% B and the rest C. Entries with too few games for a tier are listed as low sample; under 30 games
  is marked low sample everywhere. `src/content/tierlists` can override individual tiers.
- **Rank floors** (Master+, Diamond+, Emerald+, …): each has its own tier lists and comps when it has enough games and
  differs from its neighbours by at least 10% in games.
- **Regions:** tier lists and Compare can narrow to one region at the default floor, once it has 1,000 matches.
- **Other patches:** tier lists, comps and Patch Changes can switch to another of the set's patches. Earlier patches
  use their saved snapshots. While the stats fall back to the previous patch, the newest one is offered early from
  250 matches, and its match count shows either way.
- **Forms:** match data reports a form like Lux (Coven) by her base name, so each board's form is worked out from the
  trait counts the rest of the board can't explain.
- **Champion pages:** item builds (1–3 item subsets) with a best-next-item finder, and best partners and traits, each
  compared with the champion's own average (the Δ column). Boards with more items place better simply because the
  player is ahead, so Δ is the fairer comparison.
- **Patch history and trends:** each patch's tier list stats, comps and raw counters are saved permanently, even after
  its boards are pruned. Detail pages chart average placement and play rate per patch; Patch Changes and trend
  badges compare with the previous patch.

## Detected comps

Boards are grouped by their carries (the units holding most items) and two core traits. Groups whose core boards
share most of their units are merged, so an emblem or an extra unit doesn't split one comp in two; the comp is named
after the carries most of its boards play. A comp needs at least 150 games, 0.2% of boards and at least one first
place. Match data has no positions, so comp boards are laid out by attack range.

## Explorer

Every board of the shown patch, queried in the browser in a Web Worker. Boards are packed into one file per champion
or trait (split by rank, so a rank floor downloads only what it covers) plus totals. A query loads its first
champion's file, else its first trait's, else the totals, and filters by champions (star level, items), traits and
level. The Team Builder compares its board with every board that has its main carry.

## Finished sets

Once a set is no longer live and no new boards have come in for 7 days, the next deploy builds it one last time and
freezes it:

- its built files go to the stats bucket under `archive/set{N}/`, and its Explorer files to the public bucket under
  `archive/set{N}/explorer/`;
- its game data is archived too (`archive/set{N}/game-data.json`) and replaces the client's copy from then on, so it
  stays matched to its stats, and the set stays listed even if the client drops it;
- later deploys publish the archive instead of rebuilding, and its pages say the stats are final.

The set's boards stay in R2 but aren't read again. To rebuild a frozen set, see
[Maintenance](maintenance.md#re-freezing-a-set).

## Storage

The stats bucket (private) holds:

```
state/{platform}.json                           player pool and last-crawl times
seen/{platform}.txt                             processed match IDs
patches.json                                    the patch timeline
boards/set{N}/{patch}/{runStart}-{region}.jsonl.gz   stored boards
summaries/set{N}/[ranks/{floor}/]{patch}.json   each patch's tier list stats, kept permanently
comps/set{N}/[ranks/{floor}/]{patch}.json       each patch's detected comps, kept permanently
counters/set{N}/{patch}.json.gz                 each patch's raw counts, kept permanently
archive/set{N}/                                 finished sets
build/                                          the last stats build, for reuse
```

The public bucket holds the Explorer's files: one folder per deploy's workflow run, and finished sets' under `archive/`.

## Running it locally

```bash
RIOT_API_KEY=… npm run crawl -- --state .stats-local --platforms na1 --max-matches 200
npm run stats -- --stats .stats-local
```

With `--state`/`--stats` and no `R2_*` variables, everything is stored in that folder instead of R2. To try freezing,
add `--public-stats <dir>` (standing in for the public bucket) and `--live-set <N>` with a set newer than the one
crawled. The build lists any unit, item or trait names it couldn't match to the game data.
