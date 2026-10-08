import type { QueryClient } from "@tanstack/react-query";
import { Compass } from "lucide-react";
import { createRootRouteWithContext, HeadContent, Link, Outlet } from "@tanstack/react-router";
import { GameHoverCardHost } from "@/components/game/game-hover-card";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { NotFoundState, SearchButton } from "@/components/layout/not-found-state";
import { Button } from "@/components/ui/button";
import { prefetchActiveSet } from "@/lib/data/active-set";
import { manifestQuery } from "@/lib/data/queries";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({ meta: [{ title: "TFTeam" }] }),
  loader: async ({ context: { queryClient } }) => {
    const manifest = await queryClient.ensureQueryData(manifestQuery);
    // Not awaited, so the layout renders meanwhile; it saves pages a round trip after their code loads.
    void prefetchActiveSet(queryClient, manifest);
  },
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <HeadContent />
      <Header />
      {/* At least a screen tall, so the footer starts below the fold and doesn't jump as pages load their data. */}
      <main className="mx-auto min-h-dvh w-full max-w-7xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <Footer />
      <GameHoverCardHost />
    </div>
  );
}

/** Places most visits are headed, offered when a link leads nowhere. */
const QUICK_LINKS = [
  { to: "/tierlist/comps", label: "Comp tier list" },
  { to: "/builder", label: "Team Builder" },
  { to: "/champions", label: "Champions" },
  { to: "/items", label: "Items" },
] as const;

function NotFound() {
  return (
    <NotFoundState
      icon={Compass}
      title="Page not found"
      description="There's nothing at this address. The link may be mistyped or out of date."
      footer={
        <nav aria-label="Popular pages" className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-sm">
          {QUICK_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className="text-muted-foreground hover:text-foreground hover:underline">
              {label}
            </Link>
          ))}
        </nav>
      }
    >
      <Button asChild>
        <Link to="/">Back home</Link>
      </Button>
      <SearchButton />
    </NotFoundState>
  );
}
