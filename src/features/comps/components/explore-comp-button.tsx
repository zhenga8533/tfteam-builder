import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameData } from "@/lib/data/hooks";
import { signatureFilters } from "../explorer-filters";

/** Opens the Explorer on a comp's carries and core traits, to narrow its boards by items, level and more. */
export function ExploreCompButton({ signature }: { signature: string }) {
  const { traitsByApi } = useGameData();
  const filters = signatureFilters(signature, traitsByApi);
  if (filters.length === 0) return null;
  return (
    <Button asChild variant="outline">
      <Link to="/explorer" search={{ filters }} title="See this comp's boards in the Explorer">
        <Compass /> Explore boards
      </Link>
    </Button>
  );
}
