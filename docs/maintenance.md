# Maintenance

Open, one-off tasks are tracked as [GitHub issues](https://github.com/zhenga8533/tfteam/issues). This page covers
what recurs and what's known.

## Recurring tasks

- **Renewing a development key.** Development keys expire 24 hours after they're generated. Crawls then fail with
  "Riot rejected the API key" and the site's stats stop updating until it's replaced: `gh secret set RIOT_API_KEY`. A
  production key removes this; until then, setting the `CRAWL_ENABLED` variable to `false` pauses crawling.
- **Keeping scheduled workflows alive.** GitHub disables scheduled workflows in public repositories after 60 days
  without activity. If stats stop updating, re-enable **Crawl** from the Actions tab.
- **Updating tier list overrides and comp guides** when a patch changes the meta (see
  [Writing comps and tier lists](../src/content/README.md)). Tests fail if a patch removes or renames something a
  guide uses.

## When a new set launches

1. The day it goes live, check that the set switcher shows it as current and that crawls file games under its first
   patch (`set {N} patch {N}.1` in the crawl summary).
2. Stats appear once the set has enough games, at a lower rank floor at first while the ladder fills up.
3. About 7 days after the previous set stopped receiving games, a deploy freezes it. Check the deploy log for
   `set {N}: frozen at patch …`, then that its pages and Explorer still load.

## Re-freezing a set

A frozen set is published from its archive. To rebuild it from its stored boards (for example after a stats fix),
delete `archive/set{N}/complete.json` from the stats bucket and run **Deploy** by hand. It rebuilds the set and
freezes it again.

## Triggering a deploy by hand

Run **Deploy** from the Actions tab (`gh workflow run deploy.yml`). It always rebuilds the stats. Use it if a merge
didn't start a deploy, or after changing secrets.

## Known limitations

- **Patch start times are estimates.** Match data has no version, and Riot's notes give the day but not the hour of a
  change, so changes are taken to happen at 18:00 UTC. Games within 3 hours of a change are left out of the stats.
- **Patch letters depend on the notes.** Updates are lettered as Riot counts them and only balance changes start a
  patch. If Riot's notes change format, the parser may miss updates; tests built from real articles guard against
  regressions in the code.
- **Augments aren't in match data**, so their tier list is hand-written.
- **Comp positions aren't in match data**, so detected comp boards are laid out by attack range.
- **Older sets' art is small** (256 px) once they leave the live game; the champion dialog shows it over a blurred fill
  rather than stretched.
