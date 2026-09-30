import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Game data only changes when the pipeline redeploys, so never refetch within a session.
      staleTime: Infinity,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});
