import { ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { encodeTeamCode, supportsTeamCodes } from "@/features/builder/team-code";
import { useActiveSet, useGameData } from "@/lib/data/hooks";
import { copyText } from "@/lib/share";

/**
 * Copies a code for the in-game Team Planner. It holds 10 champions, so put the ones that matter most first (e.g. a
 * guide's core units before its flex picks). Hidden for sets whose champions have no planner codes.
 */
export function CopyTeamCodeButton({ apiNames }: { apiNames: string[] }) {
  const { set } = useActiveSet();
  const { champions } = useGameData();
  if (!supportsTeamCodes(champions)) return null;
  return (
    <Button
      variant="outline"
      title="For the in-game Team Planner (up to 10 champions)"
      onClick={() =>
        copyText(
          encodeTeamCode(apiNames, champions, set),
          "Team code copied. Paste it into the in-game Team Planner.",
          {
            showOnFailure: true,
          },
        )
      }
    >
      <ClipboardCopy /> Copy team code
    </Button>
  );
}
