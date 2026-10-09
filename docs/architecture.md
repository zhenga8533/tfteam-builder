# Architecture

TFTeam is a static site: everything it shows is built ahead of time into JSON files and published to GitHub Pages
(with the Explorer's larger files on Cloudflare R2). There's no server.

## How data flows

**Game data** (champions, traits, items, augments), on every deploy:

1. `scripts/build-data.ts` downloads CommunityDragon's export for the live and PBE patches.
2. It splits it into one small file per set under `public/data/{latest,pbe}/`, plus `public/data/manifest.json`.

See [Game data](game-data.md).

**Match stats**, every 3 hours:

1. **Crawl** (`scripts/crawl.ts`): fetches recent ranked games for a pool of players on every server, works out
   which TFT patch each was played on, and stores every player's final board in R2.
2. **Build** (`scripts/build-stats.ts`, on deploy): reads the stored boards and builds everything the site shows:
   tier lists, champion, item and trait pages, comps, patch changes, rank and region views, other patches and the
   Explorer's files. It also saves a permanent snapshot of each patch for history and trends.
3. **Publish**: the Explorer's files go to a public R2 bucket (`scripts/publish-explorer.ts`); the site, with the rest
   of the stats in `public/data/stats/`, goes to GitHub Pages.

See [Match stats](match-stats.md) and [Deployment](deployment.md).

**In the browser**, the site loads only the selected set's game data and stats. The Explorer runs its queries in a
Web Worker over files it downloads on demand.

## Where the code lives

```
scripts/
  build-data.ts  crawl.ts  build-stats.ts  publish-explorer.ts   entry points
  data/     game data from CommunityDragon: transform, shop odds, set items
  crawl/    match crawler: Riot API client, player seeding, crawl order and report
  store/    R2 (or a local folder) storage for boards, state and snapshots, and their types
  stats/    the stats build: tier lists, detail pages, comps, trends, Explorer files, freezing, build reuse
  lib/      shared: Riot's patch notes timeline, board counting, concurrency, test fixtures
src/
  routes/       pages, one file per URL (TanStack Router)
  features/     builder/, comps/, stats/, explorer/, tier-maker/: each with its components and logic
  components/   ui/ (shadcn), game/ (icons, cards, filters), layout/ (header, footer, empty and not-found states)
  content/      hand-written comp guides and tier list overrides (see its README)
  lib/          data loading and schemas, game logic (boards, traits, stat lines), the Explorer engine
  stores/       persisted settings (selected set and patch, theme)
e2e/            Playwright smoke tests against the built site
```

Unit tests sit next to the file they cover (`stats.ts` and `stats.test.ts`) and run with Vitest.

## Tech

React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Router and Query, shadcn/ui (Radix), Zustand, dnd kit, Zod;
Vitest, Playwright, ESLint and Prettier.
