<a id="readme-top"></a>

<h1 align="center">TFTeam Builder</h1>

<div align="center">

[![Contributors][contributors-shield]][contributors-url] [![Forks][forks-shield]][forks-url] [![Stargazers][stars-shield]][stars-url] [![Issues][issues-shield]][issues-url] [![MIT License][license-shield]][license-url] [![LinkedIn][linkedin-shield]][linkedin-url]

</div>

<div>
  <p align="center">
    TFTeam Builder is a Teamfight Tactics (TFT) companion site: plan boards in a drag-and-drop team builder, follow the comp, item and augment tier lists, and browse every champion, trait, item and augment for the current and previous sets.
    <br />
    <br />
    <a href="https://zhenga8533.github.io/tfteam-builder">View Demo</a>
    &middot;
    <a href="https://github.com/zhenga8533/tfteam-builder/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    &middot;
    <a href="https://github.com/zhenga8533/tfteam-builder/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
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

TFTeam Builder was created to simplify planning team compositions in Teamfight Tactics. Whether you're strategizing before a match or exploring trait combinations, it makes it easy to visualize a board and see how each unit contributes to your synergies.

- **Team Builder** – drag champions and items onto a hex board (mouse, touch or keyboard), set star levels, and watch traits update live. Save teams locally and import/export in-game Team Planner codes.
- **Comp Tier List** – ranked comps with final and early boards, carries, items, augments and tips. Open any comp in the Team Builder with one click.
- **Item & Augment Tier Lists** – curated rankings for the current set.
- **Database** – searchable champions, traits, items (with a crafting table) and augments, with filters kept in the URL so views can be shared.
- **Live and PBE data** – switch between the live patch and PBE, and between the current and previous sets.

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
git clone https://github.com/zhenga8533/tfteam-builder.git
cd tfteam-builder
```

2. Install dependencies:

```bash
npm install
```

3. Generate the game data (downloads from CommunityDragon into `public/data`, skipped when already up to date):

```bash
npm run data
```

4. Run the development server and open http://localhost:5173/tfteam-builder/:

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
| `npm run lint` / `npm run format`     | Lint with ESLint / format with Prettier                   |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ARCHITECTURE -->

## Architecture

```
scripts/            CommunityDragon data pipeline
src/
  routes/           file-based routes (TanStack Router)
  features/         builder/ and comps/ feature modules
  components/       ui/ (shadcn), game/ (icons, cards, hex grid), layout/
  content/          authored comps and tier lists
  lib/              data loading, game logic (board, traits, tooltip parser)
  stores/           persisted user settings
```

### Game Data

The full CommunityDragon TFT export is ~24 MB per patch. `scripts/build-data.ts` downloads it for the live and PBE patches and
trims it to the three most recent sets. It filters out placeholder and duplicate entries, classifies items (components,
completed, emblems, radiants, artifacts), reads augment tiers, and adds team planner codes. The result is small per-set JSON
files validated with Zod. The app loads only the set being viewed.

### Match Stats

Champion, item and trait tier lists, the stat lines on database pages, and the builder's best items all come from
ranked games collected through the [Riot Games API](https://developer.riotgames.com/). Riot no longer includes augments in
match data, so the augment tier list and comp guides stay hand-written.

- **Crawl** (`.github/workflows/crawl.yml`, every 3 hours): `scripts/stats/crawl.ts` builds a player pool on every server
  from the top of the ranked ladder down, then fetches their new ranked matches. It adds each match to running totals
  per set, patch and rank bucket, and saves them to the `stats` branch as a single commit.
- **Build** (on deploy): `scripts/build-stats.ts` turns those totals into `public/data/stats/set{N}.json`. It shows
  Diamond+ games when there are enough. Otherwise it falls back to the previous patch of the same set, or to lower ranks
  early in a set, when the top of the ladder is still nearly empty. The page states which ranks and patch the stats
  come from.
- **Tiers:** entries are ranked by average placement, pulled toward 4.5 when there are few games. The top 10% are S,
  the next 25% A, the next 35% B and the rest C. Entries in `src/content/tierlists` override individual tiers.
- **Forms and traits:** champion forms that never appear in the shop (e.g. Lux's elemental forms) are detected from
  CDragon by name. They count toward their base champion and get their own stats once they have enough games. Every trait
  in a set is tracked, including ones granted by augments or set mechanics, which the Traits page lists separately.

To enable crawling:

1. Register the project on the [Riot Developer Portal](https://developer.riotgames.com/) and create a personal API key.
   Apply for a production key before relying on the stats publicly.
2. Add the key as the `RIOT_API_KEY` repository secret. Then add a repository variable `CRAWL_ENABLED` set to `true`.
3. Start the **Crawl** workflow manually, or wait for the next scheduled run.

To crawl locally: `RIOT_API_KEY=… npm run crawl -- --state .stats-local --platforms na1 --max-matches 200`, then
`npm run stats -- --stats .stats-local`. The stats build lists any unit, item or trait names it couldn't match to
the game data.

> GitHub disables scheduled workflows in public repositories after 60 days without activity. If stats stop updating,
> re-enable the Crawl workflow from the Actions tab.

### Comps and Tier Lists

Comps and tier lists are typed modules in [`src/content`](src/content/README.md). The Team Builder's **Export** button
generates a comp file from the current board. Tests check every champion, item and augment reference against the latest
data, so a patch that removes or renames something fails CI instead of breaking a guide.

### Deployment

GitHub Actions deploys to GitHub Pages on every push to `main` and daily, which picks up new patches without a code change.
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

<a href="https://github.com/zhenga8533/tfteam-builder/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=zhenga8533/tfteam-builder" alt="contrib.rocks image" />
</a>

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->

## Contact

Allen Zheng - zhenga8533@gmail.com

Project Link: [https://github.com/zhenga8533/tfteam-builder](https://github.com/zhenga8533/tfteam-builder)

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

[contributors-shield]: https://img.shields.io/github/contributors/zhenga8533/tfteam-builder.svg?style=for-the-badge
[contributors-url]: https://github.com/zhenga8533/tfteam-builder/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/zhenga8533/tfteam-builder.svg?style=for-the-badge
[forks-url]: https://github.com/zhenga8533/tfteam-builder/network/members
[stars-shield]: https://img.shields.io/github/stars/zhenga8533/tfteam-builder.svg?style=for-the-badge
[stars-url]: https://github.com/zhenga8533/tfteam-builder/stargazers
[issues-shield]: https://img.shields.io/github/issues/zhenga8533/tfteam-builder.svg?style=for-the-badge
[issues-url]: https://github.com/zhenga8533/tfteam-builder/issues
[license-shield]: https://img.shields.io/github/license/zhenga8533/tfteam-builder.svg?style=for-the-badge
[license-url]: https://github.com/zhenga8533/tfteam-builder/blob/master/LICENSE
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
