<a id="readme-top"></a>

<h1 align="center">TFTeam</h1>

<div align="center">

[![Contributors][contributors-shield]][contributors-url] [![Forks][forks-shield]][forks-url] [![Stargazers][stars-shield]][stars-url] [![Issues][issues-shield]][issues-url] [![MIT License][license-shield]][license-url] [![LinkedIn][linkedin-shield]][linkedin-url]

</div>

<div>
  <p align="center">
    TFTeam is a Teamfight Tactics (TFT) companion site: plan boards in a drag-and-drop team builder, follow the comp, item and augment tier lists, and browse every champion, trait, item and augment for the current and previous sets.
    <br />
    <br />
    <a href="https://zhenga8533.github.io/tfteam">View Demo</a>
    &middot;
    <a href="https://github.com/zhenga8533/tfteam/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    &middot;
    <a href="https://github.com/zhenga8533/tfteam/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#scripts">Scripts</a></li>
      </ul>
    </li>
    <li>
      <a href="#architecture">Architecture</a>
      <ul>
        <li><a href="#game-data">Game Data</a></li>
        <li><a href="#match-stats">Match Stats</a></li>
        <li><a href="#comps-and-tier-lists">Comps and Tier Lists</a></li>
        <li><a href="#deployment">Deployment</a></li>
      </ul>
    </li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

TFTeam was created to simplify planning team compositions in Teamfight Tactics. Whether you're strategizing before a match or exploring trait combinations, it makes it easy to visualize a board and see how each unit contributes to your synergies.

- **Team Builder** – drag champions and items onto a hex board (mouse, touch or keyboard), set star levels, and watch traits update live. Plan a board per level, mark flex units and alternatives, follow the trait ladder or autofill to your level, see how similar ranked boards place, find the emblem that adds the most traits, and equip a champion's best build in one click. Save teams locally and import/export in-game Team Planner codes.
- **Tier Lists** – comps detected from ranked games plus hand-written guides, and champion, item and trait tier lists ranked by average placement, with filters. Tier lists, detected comps and Patch Changes can switch rank (Master+, Diamond+, …), and the champion, item and trait tier lists can narrow to a region. Pages show placement distributions, comps show placement by final level, and the home page highlights comps rising since the last patch. Open any comp in the Team Builder with one click.
- **Stats pages** – every champion, item and trait has a page: item builds and a best-next-item finder, best holders and partners, breakpoints and the comps that use it.
- **Explorer** – filter ranked boards by champions, items, traits and level, and see what else does well with them.
- **Patch Changes** – what got better or worse since the last patch.
- **Tools** – Explorer, Compare (two champions, items or comps side by side), Roll Odds (your chance to hit a 2★ or 3★, from the set's shop odds and pool) and a Component Planner (what your components build into, ranked for your carry).
- **Database** – searchable champions, traits, items (with a crafting table) and augments, with filters kept in the URL so views can be shared.
- **Live and PBE data** – switch between the live patch and PBE, and between every set CommunityDragon has. Light, dark or system theme.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

- [![React][react-badge]][react-url]
- [![TypeScript][typescript-badge]][typescript-url]
- [![Vite][vite-badge]][vite-url]
- [![Tailwind CSS][tailwind-badge]][tailwind-url]
- [TanStack Router & Query](https://tanstack.com/), [shadcn/ui](https://ui.shadcn.com/) (Radix UI), [Zustand](https://zustand.docs.pmnd.rs/), [dnd kit](https://dndkit.com/)
- [Vitest](https://vitest.dev/), [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js 22 or later
- npm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/zhenga8533/tfteam.git
cd tfteam
```

2. Install dependencies:

```bash
npm install
```

3. Generate the game data (downloads from CommunityDragon into `public/data`, skipped when already up to date):

```bash
npm run data
```

4. Run the development server and open http://localhost:5173/tfteam/:

```bash
npm run dev
```

### Scripts

| Script                                | Description                                               |
| ------------------------------------- | --------------------------------------------------------- |
| `npm run dev`                         | Start the Vite dev server                                 |
| `npm run build`                       | Type-check and build to `dist/`                           |
| `npm run data` / `npm run data:force` | Regenerate game data when the patch changes / always      |
| `npm run crawl` / `npm run stats`     | Crawl ranked matches (needs `RIOT_API_KEY`) / build stats |
| `npm test`                            | Run unit tests and validate comp and tier list content    |
| `npm run test:e2e`                    | Smoke-test the built site in a browser (Playwright)       |
| `npm run lint` / `npm run format`     | Lint with ESLint / format with Prettier                   |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ARCHITECTURE -->

## Architecture

```
scripts/            CommunityDragon data pipeline; stats/ crawler and stats build
src/
  routes/           file-based routes (TanStack Router)
  features/         builder/, comps/, stats/ and explorer/ feature modules
  components/       ui/ (shadcn), game/ (icons, cards, links, hex grid), layout/
  content/          authored comps and tier lists
  lib/              data loading, game logic (board, traits, trait planner, stat lines), explorer engine
  stores/           persisted user settings
```

### Game Data

The full CommunityDragon TFT export is ~24 MB per patch. `scripts/build-data.ts` downloads it for the live and PBE patches and
splits it into one file per mainline set. It filters out placeholder and duplicate entries, classifies items (components,
completed, emblems, radiants, artifacts), reads augment tiers and champion roles, adds team planner codes, and reads each set's shop odds and champion pool from Riot's map data. The result is small per-set JSON
files validated with Zod. The app loads only the set being viewed.

### Match Stats

Champion, item and trait tier lists, the stat lines on database pages, and the builder's best items all come from
ranked games collected through the [Riot Games API](https://developer.riotgames.com/). Riot no longer includes augments in
match data, so the augment tier list and comp guides stay hand-written.

- **Crawl** (`.github/workflows/crawl.yml`, every 3 hours): `scripts/stats/crawl.ts` builds a player pool on every server
  and fetches their new ranked matches. Each pool is shared between tiers (40% Master+, 35% Diamond, 25% Emerald), so
  every rank floor gets games of its own; space a tier can't fill passes down, reaching Platinum and Gold only early in
  a set. A match counts toward the tier of the player it was found through. Every player's final board is stored in
  [Cloudflare R2](https://developers.cloudflare.com/r2/), as one gzipped chunk per region per run, together with the
  crawler's state. Boards are kept for the current and previous patch of each set. Each run's summary on its Actions
  page lists players checked, games kept per tier and the pools' make-up.
- **Build** (on deploy): `scripts/build-stats.ts` reads the stored boards and builds `public/data/stats/set{N}.json`.
  It also saves a summary of each patch's stats to R2 permanently. It shows
  Diamond+ games when there are enough. Otherwise it falls back to the previous patch of the same set, or to lower ranks
  early in a set, when the top of the ladder is still nearly empty. The page states which ranks and patch the stats
  come from.
- **Tiers:** pages show each entry's real average placement; tiers and "best" orderings rank by that average pulled
  toward 4.5 when there are few games, so a handful of lucky games can't top a list. The top 10% are S, the next 25% A,
  the next 35% B and the rest C. Entries with too few games for a tier are listed as low sample, and entries under
  30 games are marked as such everywhere. Entries in `src/content/tierlists` override individual tiers.
- **Forms and traits:** champion forms that never appear in the shop (e.g. Lux (Coven)) are detected from CDragon by
  name and listed as champions of their own. Match data reports Lux by her base name, so the stats build works out each
  board's form from the trait counts the rest of the board can't explain. Every trait in a set is tracked, including
  ones granted by augments or set mechanics, which the Traits page lists separately.
- **Champion pages** (`/champions/{apiName}`): item builds (1–3 item subsets) with a best-next-item finder, best partner
  units and traits, each compared with the champion's own average placement (the Δ column). Boards with more items
  place better simply because the player is ahead, so Δ is the fairer comparison.
- **Item and trait pages** (`/items/{apiName}`, `/traits/{apiName}`): an item's best holders, the items built with it
  and its comps; a trait's breakpoints, the units that do best while it's active, and its comps.
- **Detected comps:** boards are grouped by their carries and two core traits, then groups whose core boards share most
  of their units are merged, so an emblem or an extra unit doesn't split one comp in two. A comp needs at least 150
  games, 0.2% of boards and a first place. Match data has no positions, so comp boards are laid out by unit range.
- **Patches:** stats are split by TFT patch, b patches included (18.3, 18.3b), using the release dates in
  [Riot's patch notes](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/), because match data no
  longer reports a version. Right after a patch or b patch, the previous one is shown until there are enough games.
- **Finished sets:** once a set is no longer the live set and no new boards have come in for 7 days, the next deploy
  builds it one last time and freezes it. Its built files are archived in the stats bucket (`archive/set{N}/`) and its
  Explorer files in the public bucket (`archive/set{N}/explorer/`), and later deploys publish the archive instead of
  rebuilding the set; its pages say the stats are final. The set's boards stay in R2 but aren't read again. To rebuild a
  frozen set from them, delete `archive/set{N}/complete.json` from the stats bucket and run the **Deploy** workflow
  manually; it re-freezes the set.
- **Explorer** (`/explorer`): every board of the patch, queried in the browser (in a Web Worker). A query loads its
  first champion's files, else its first trait's (each holds every board with them, split by rank so a floor
  downloads only the ranks it covers), else the totals (every board's counts by rank and level). Filter by champions
  (star level, items), traits and level, and see which champions, traits and items do best with them. The builder
  compares its board with every board that has its main carry. The stats build keeps boards packed as numbers until
  each file is written, so its memory stays small as the number of games grows.

To enable crawling:

1. Register the project on the [Riot Developer Portal](https://developer.riotgames.com/) and create a personal API key.
   Apply for a production key before relying on the stats publicly.
2. In Cloudflare, create an R2 bucket. Then create an R2 API token with **Object Read & Write** permission, scoped to that
   bucket.
3. Add repository secrets: `RIOT_API_KEY`; `R2_ACCOUNT_ID` (your Cloudflare account ID), `R2_ACCESS_KEY_ID` and
   `R2_SECRET_ACCESS_KEY` (from the token), and `R2_BUCKET` (the bucket name). Then add a repository variable
   `CRAWL_ENABLED` set to `true`.
4. Start the **Crawl** workflow manually, or wait for the next scheduled run.

To serve the Explorer's files from R2 instead of the site (they grow with the data; GitHub Pages sites are limited to
1 GB):

1. Create a second R2 bucket for public files only (the stats bucket holds crawler state and must stay private), and
   turn on its public **r2.dev** URL (or connect a custom domain).
2. Add a CORS policy to it allowing `GET` from the site's origin (and `http://localhost:5173` for local testing).
3. Give the R2 API token **Object Read & Write** on this bucket too.
4. Add repository variables `R2_PUBLIC_BUCKET` (the bucket name) and `EXPLORER_PUBLIC_URL` (its public URL).

Each deploy then uploads the Explorer's files to a folder named after its workflow run and builds the site to read
from there; folders from older deploys are deleted. Frozen sets' files stay in `archive/`. Without these variables,
the files are bundled into the site, and finished sets aren't frozen.

A deploy with nothing new to build (no new boards, and no change to the game data or to the code under `scripts/` and
`src/lib/`) republishes the last build instead of rebuilding: its stats files are kept in the stats bucket (`build/`)
and its Explorer files stay in its run's folder. Running the **Deploy** workflow manually always rebuilds.

A development key works for test crawls, but it expires 24 hours after it's generated: crawls then fail with
"Riot rejected the API key" until `RIOT_API_KEY` is updated (`gh secret set RIOT_API_KEY` prompts for it). Riot meant
development keys for development, so use a personal or production key for the live site's stats.

To crawl locally: `RIOT_API_KEY=… npm run crawl -- --state .stats-local --platforms na1 --max-matches 200`, then
`npm run stats -- --stats .stats-local`. With `--state`/`--stats` and no `R2_*` variables set, everything is stored
in that local directory instead of R2. To try freezing locally, add `--public-stats <dir>` (standing in for the public
bucket) and `--live-set <N>` with a newer set than the one crawled. The stats build lists any unit, item or trait names it couldn't match to the
game data.

> GitHub disables scheduled workflows in public repositories after 60 days without activity. If stats stop updating,
> re-enable the Crawl workflow from the Actions tab.

### Comps and Tier Lists

Comps and tier lists are typed modules in [`src/content`](src/content/README.md). The Team Builder's **Share → Export as
comp file** generates a comp file from the current board. Tests check every champion, item and augment reference against the latest
data, so a patch that removes or renames something fails CI instead of breaking a guide.

### Deployment

GitHub Actions deploys to GitHub Pages on every push to `main`, after every successful crawl and daily, which picks up
new patches and stats without a code change.
Pull requests and other branches run lint, formatting, tests and a build.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Top contributors:

<a href="https://github.com/zhenga8533/tfteam/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=zhenga8533/tfteam" alt="contrib.rocks image" />
</a>

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->

## Contact

Allen Zheng - zhenga8533@gmail.com

Project Link: [https://github.com/zhenga8533/tfteam](https://github.com/zhenga8533/tfteam)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->

## Acknowledgments

Special thanks to the following resources and individuals who made this project possible:

- [Teamfight Tactics](https://teamfighttactics.leagueoflegends.com/) — for game inspiration and champion mechanics
- [CommunityDragon](https://raw.communitydragon.org/) — for providing structured, up-to-date TFT assets and champion data
- [Best README Template](https://github.com/othneildrew/Best-README-Template) — for this markdown structure

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[contributors-shield]: https://img.shields.io/github/contributors/zhenga8533/tfteam.svg?style=for-the-badge
[contributors-url]: https://github.com/zhenga8533/tfteam/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/zhenga8533/tfteam.svg?style=for-the-badge
[forks-url]: https://github.com/zhenga8533/tfteam/network/members
[stars-shield]: https://img.shields.io/github/stars/zhenga8533/tfteam.svg?style=for-the-badge
[stars-url]: https://github.com/zhenga8533/tfteam/stargazers
[issues-shield]: https://img.shields.io/github/issues/zhenga8533/tfteam.svg?style=for-the-badge
[issues-url]: https://github.com/zhenga8533/tfteam/issues
[license-shield]: https://img.shields.io/github/license/zhenga8533/tfteam.svg?style=for-the-badge
[license-url]: https://github.com/zhenga8533/tfteam/blob/master/LICENSE
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/zhenga8533

<!-- Built With -->

[react-badge]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[react-url]: https://reactjs.org/
[typescript-badge]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[typescript-url]: https://www.typescriptlang.org/
[vite-badge]: https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white
[vite-url]: https://vitejs.dev/
[tailwind-badge]: https://img.shields.io/badge/Tailwind_CSS-0F172A?style=for-the-badge&logo=tailwindcss&logoColor=38BDF8
[tailwind-url]: https://tailwindcss.com/
