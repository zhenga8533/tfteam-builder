import { Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { timeAgo } from "@/features/stats/format";
import { useManifest } from "@/lib/data/hooks";
import { isNavGroup, NAV } from "./nav";

const REPOSITORY = "https://github.com/zhenga8533/tfteam-builder";

const linkClass = "text-muted-foreground transition-colors hover:text-foreground";

function DataStatus() {
  const manifest = useManifest();
  return (
    <p>
      Live patch {manifest.patches.latest.label} · PBE {manifest.patches.pbe.label} · data updated{" "}
      {timeAgo(manifest.generatedAt)}
    </p>
  );
}

export function Footer() {
  const groups = NAV.filter(isNavGroup);
  const tools = NAV.flatMap((entry) => (isNavGroup(entry) ? [] : [entry]));

  return (
    <footer className="border-t text-sm">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Link to="/" className="font-display text-lg font-bold tracking-tight">
            TFTeam<span className="text-primary">.</span>
          </Link>
          <p className="text-muted-foreground">Comps, stats and a team builder for Teamfight Tactics.</p>
        </div>
        {groups.map((group) => (
          <nav key={group.label} aria-label={group.label} className="space-y-2">
            <p className="font-semibold">{group.label}</p>
            <ul className="space-y-1.5">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <nav aria-label="Tools" className="space-y-2">
          <p className="font-semibold">Tools</p>
          <ul className="space-y-1.5">
            {tools.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={REPOSITORY} className={linkClass}>
                Source on GitHub
              </a>
            </li>
            <li>
              <a href={`${REPOSITORY}/issues/new`} className={linkClass}>
                Report a problem
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <Suspense>
            <DataStatus />
          </Suspense>
          <p>
            Game data from{" "}
            <a href="https://www.communitydragon.org/" className="underline-offset-4 hover:underline">
              CommunityDragon
            </a>{" "}
            and the Riot Games API.
          </p>
        </div>
        <p className="mx-auto max-w-7xl px-4 pb-6 text-[11px] text-muted-foreground/70">
          TFTeam Builder isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone
          officially involved in producing or managing Riot Games properties. Riot Games and all associated properties
          are trademarks or registered trademarks of Riot Games, Inc.
        </p>
      </div>
    </footer>
  );
}
