import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameData } from "@/lib/data/hooks";
import type { RankFloor } from "@/lib/data/schema";
import { signatureFilters } from "../explorer-filters";

/** Opens the Explorer on a comp's carries and core traits, to narrow its boards by items, level and more. */
export function ExploreCompButton({ signature, rank }: { signature: string; rank?: RankFloor }) {
  const { traitsByApi } = useGameData();
  const filters = signatureFilters(signature, traitsByApi);
  if (filters.length === 0) return null;
  return (
    <Button asChild variant="outline">
      <Link to="/explorer" search={{ filters, rank }} title="See this comp's boards in the Explorer">
        <Compass /> Explore boards
      </Link>
    </Button>
  );
}
