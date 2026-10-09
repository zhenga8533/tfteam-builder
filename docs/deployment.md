# Deployment

The site is built and published by GitHub Actions to GitHub Pages; match data lives in Cloudflare R2.

## Workflows

| Workflow       | When                                                                       | What it does                                                                        |
| -------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `ci.yml`       | Pull requests and pushes to `dev`                                          | Lint, format check, game data, unit tests, build, browser smoke tests               |
| `crawl.yml`    | Every 3 hours (at :15), or by hand                                         | Crawls ranked matches into R2 (only when the `CRAWL_ENABLED` variable is `true`)    |
| `deploy.yml`   | Pushes to `main`, after each successful crawl, daily at 12:00 UTC, by hand | Game data, tests, stats build, Explorer upload, site build, publish to GitHub Pages |
| `sync-dev.yml` | Pushes to `main`                                                           | Fast-forwards `dev` to `main`                                                       |

Changes go through a pull request into `main`; merging deploys them.

**Build reuse:** a deploy with nothing new (no new boards, and no change to the game data or to code under `scripts/`
and `src/lib/`) republishes the last stats build instead of rebuilding: its files are kept in the stats bucket
(`build/`) and its Explorer files stay in their run's folder. Running **Deploy** by hand always rebuilds.

## Secrets and variables

| Name                   | Kind     | Purpose                                                    |
| ---------------------- | -------- | ---------------------------------------------------------- |
| `RIOT_API_KEY`         | Secret   | Riot API key for the crawler                               |
| `R2_ACCOUNT_ID`        | Secret   | Cloudflare account ID                                      |
| `R2_ACCESS_KEY_ID`     | Secret   | R2 API token's access key                                  |
| `R2_SECRET_ACCESS_KEY` | Secret   | R2 API token's secret                                      |
| `R2_BUCKET`            | Secret   | The private stats bucket                                   |
| `CRAWL_ENABLED`        | Variable | `true` to run scheduled crawls                             |
| `R2_PUBLIC_BUCKET`     | Variable | The public bucket for the Explorer's files and frozen sets |
| `EXPLORER_PUBLIC_URL`  | Variable | That bucket's public URL                                   |

Set secrets with `gh secret set NAME` (it prompts for the value, so it never lands in your shell history).

## Setting up crawling

1. Register the project on the [Riot Developer Portal](https://developer.riotgames.com/) and create an API key. A
   development key works for testing but expires after 24 hours; use a personal or production key for the live site.
2. In Cloudflare, create an R2 bucket for stats, and an R2 API token with **Object Read & Write** on it.
3. Add the `RIOT_API_KEY` and `R2_*` secrets above, then the `CRAWL_ENABLED` variable set to `true`.
4. Start the **Crawl** workflow by hand, or wait for the next scheduled run.

## Serving the Explorer from R2

The Explorer's files grow with the data, and GitHub Pages sites are limited to 1 GB, so they're served from R2:

1. Create a second, public R2 bucket (the stats bucket holds crawler state and must stay private) and turn on its
   public **r2.dev** URL or connect a custom domain.
2. Add a CORS policy allowing `GET` from the site's origin (and `http://localhost:5173` for local testing).
3. Give the R2 API token **Object Read & Write** on this bucket too.
4. Add the `R2_PUBLIC_BUCKET` and `EXPLORER_PUBLIC_URL` variables.

Each deploy uploads the Explorer's files to a folder named after its workflow run and builds the site to read from
there; older runs' folders are deleted. Frozen sets' files stay in `archive/`. Without these variables, the files are
bundled into the site and finished sets aren't frozen.
