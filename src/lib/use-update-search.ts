import { useNavigate } from "@tanstack/react-router";

/** Merges `patch` into the current page's search params, replacing the history entry (for filters). */
export function useUpdateSearch<TSearch extends object>() {
  const navigate = useNavigate();
  return (patch: Partial<TSearch>) =>
    navigate({ to: ".", search: (previous) => ({ ...previous, ...patch }), replace: true });
}
