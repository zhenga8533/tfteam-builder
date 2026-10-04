import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Link, Outlet } from "@tanstack/react-router";
import { GameHoverCardHost } from "@/components/game/game-hover-card";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { manifestQuery } from "@/lib/data/queries";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({ meta: [{ title: "TFTeam" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(manifestQuery),
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

function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="font-display text-6xl font-bold text-primary">404</p>
      <p className="text-muted-foreground">This page doesn't exist.</p>
      <Button asChild variant="secondary">
        <Link to="/">Back home</Link>
      </Button>
    </div>
  );
}
