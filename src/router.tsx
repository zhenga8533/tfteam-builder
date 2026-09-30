import { createRouter } from "@tanstack/react-router";
import { ErrorState } from "@/components/layout/error-state";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { queryClient } from "@/lib/query-client";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  defaultPendingComponent: PageSkeleton,
  defaultErrorComponent: ({ error }) => <ErrorState error={error} />,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
