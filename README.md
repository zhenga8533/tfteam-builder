# TFTeam

[![Deploy](https://github.com/zhenga8533/tfteam/actions/workflows/deploy.yml/badge.svg)](https://github.com/zhenga8533/tfteam/actions/workflows/deploy.yml)
[![CI](https://github.com/zhenga8533/tfteam/actions/workflows/ci.yml/badge.svg)](https://github.com/zhenga8533/tfteam/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/zhenga8533/tfteam)](LICENSE)

A Teamfight Tactics companion: plan boards in a drag-and-drop team builder, follow tier lists built from ranked games,
and look up every champion, trait, item and augment.

**[Open the site →](https://zhenga8533.github.io/tfteam/)**

## Features

- **Team Builder**: drag champions and items onto a hex board (mouse, touch or keyboard) and watch traits update. Plan
  a board per level, autofill to your level, find the emblem that adds the most traits, equip a champion's best build,
  and import or export in-game Team Planner codes.
- **Tier lists**: comps detected from ranked games plus hand-written guides, and champion, item and trait tier lists
  ranked by average placement. Switch rank floor, region or patch, including an early look at a brand-new patch.
- **Stats pages**: every champion, item and trait has a page with builds, best holders and partners, placements, and
  how its placement and play rate moved patch to patch.
- **Patch Changes**: what got better, worse, more or less played, new or gone since the last patch.
- **Tools**: an Explorer to query every ranked board in the browser, Compare, Roll Odds, a Component Planner and a Tier
  List Maker.
- **Database**: searchable champions, traits, items and augments for the live patch, the PBE and past sets.

## Quick start

Requires Node.js 22 or later.

```bash
git clone https://github.com/zhenga8533/tfteam.git
cd tfteam
npm install
npm run data   # download game data from CommunityDragon into public/data
npm run dev    # http://localhost:5173/tfteam/
```

The site works without match stats; stats need a crawl first (see [Deployment](docs/deployment.md)).

| Script                                | What it does                                                 |
| ------------------------------------- | ------------------------------------------------------------ |
| `npm run dev`                         | Start the dev server                                         |
| `npm run build`                       | Type-check and build to `dist/`                              |
| `npm run data` / `npm run data:force` | Regenerate game data when the patch changes / always         |
| `npm run crawl`                       | Crawl ranked matches (needs `RIOT_API_KEY`)                  |
| `npm run stats`                       | Build stats from the stored matches                          |
| `npm test`                            | Unit tests, including checks of comp and tier list content   |
| `npm run test:e2e`                    | Smoke-test the built site in a browser (Playwright)          |
| `npm run lint` / `npm run format`     | Lint with ESLint / format with Prettier                      |

## Project layout

```
src/        the site: routes, features (builder, comps, stats, explorer, tier maker), components, content, lib
scripts/    build and data jobs: game data, the match crawler, storage and the stats build
docs/       how it all works
e2e/        browser smoke tests
```

## Documentation

- [Architecture](docs/architecture.md): how data flows from Riot's API to a published page, and where the code lives
- [Game data](docs/game-data.md): how CommunityDragon's export becomes per-set files
- [Match stats](docs/match-stats.md): crawling, patch detection, tiers, comps and finished sets
- [Deployment](docs/deployment.md): workflows, secrets, storage and setting up crawling
- [Maintenance](docs/maintenance.md): recurring tasks, a set launch checklist and known limitations
- [Writing comps and tier lists](src/content/README.md)

## Contributing

Issues and pull requests are welcome. Pull requests run lint, formatting, unit tests, a build and the browser smoke
tests; `npm run lint`, `npm run format` and `npm test` cover most of that locally.

## License and credits

[MIT](LICENSE) © Allen Zheng ([zhenga8533@gmail.com](mailto:zhenga8533@gmail.com)).

Game data and assets from [CommunityDragon](https://www.communitydragon.org/); match data from the
[Riot Games API](https://developer.riotgames.com/). TFTeam isn't endorsed by Riot Games and doesn't reflect the views
or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and
all associated properties are trademarks or registered trademarks of Riot Games, Inc.
