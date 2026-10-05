import { Link } from "@tanstack/react-router";
import { Bug } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { timeAgo } from "@/features/stats/format";
import { isStale } from "@/lib/data/constants";
import { useManifest } from "@/lib/data/hooks";
import { statsQuery } from "@/lib/data/queries";
import { cn } from "@/lib/utils";
import { REPOSITORY } from "@/lib/site";
import { isNavGroup, NAV } from "./nav";

// Links are at least 24px tall (a comfortable touch target); the lists' spacing is tightened to match.
const linkClass = "inline-flex min-h-6 items-center text-muted-foreground transition-colors hover:text-foreground";
const iconLinkClass = `gap-1.5 ${linkClass}`;

/** The GitHub mark; lucide-react doesn't ship brand icons. */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3" />
    </svg>
  );
}

const At = ({ iso }: { iso: string }) => (
  <time dateTime={iso} title={new Date(iso).toLocaleString()}>
    {timeAgo(iso)}
  </time>
);

function DataStatus() {
  const manifest = useManifest();
  // Live stats only, and not suspending: the footer shows without them.
  const set = manifest.patches.latest.sets[0];
  const stats = useQuery({ ...statsQuery("latest", set ?? 0), enabled: set !== undefined }).data;
  const stale = stats && isStale(stats.updatedAt);
  return (
    <p>
      Live patch {manifest.patches.latest.label} · PBE patch {manifest.patches.pbe.label} · Game data refreshed{" "}
      <At iso={manifest.generatedAt} />
      {stats && (
        <span
          className={cn(stale && "font-medium text-placement-worse")}
          title={stale ? "Match collection may be paused" : undefined}
        >
          {" "}
          · Match stats updated <At iso={stats.updatedAt} />
        </span>
      )}
    </p>
  );
}

export function Footer() {
  // The nav's Tools menu joins the top-level links (Team Builder) in the footer's own Tools column.
  const groups = NAV.filter(isNavGroup).filter((group) => group.label !== "Tools");
  const tools = NAV.flatMap((entry) => (isNavGroup(entry) ? (entry.label === "Tools" ? entry.links : []) : [entry]));

  return (
    <footer className="border-t text-sm">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Link to="/" className="font-display text-lg font-bold tracking-tight">
            TFTeam<span className="text-primary">.</span>
          </Link>
          <p className="text-muted-foreground">Comps, stats and a team builder for Teamfight Tactics.</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
            <a href={REPOSITORY} className={iconLinkClass}>
              <GitHubIcon className="size-4" /> Source
            </a>
            <a href={`${REPOSITORY}/issues/new`} className={iconLinkClass}>
              <Bug className="size-4" /> Report a problem
            </a>
          </p>
        </div>
        {groups.map((group) => (
          <nav key={group.label} aria-label={group.label} className="space-y-2">
            <p className="font-semibold">{group.label}</p>
            <ul className="space-y-0.5">
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
          <ul className="space-y-0.5">
            {tools.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
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
          TFTeam isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone
          officially involved in producing or managing Riot Games properties. Riot Games and all associated properties
          are trademarks or registered trademarks of Riot Games, Inc.
        </p>
      </div>
    </footer>
  );
}
