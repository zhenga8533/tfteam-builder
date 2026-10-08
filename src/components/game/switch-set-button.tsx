import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveSet } from "@/lib/data/hooks";
import { useSettings } from "@/stores/settings";

/** Switches the site to `set`; nothing when the selected patch doesn't have it. */
export function SwitchSetButton({ set }: { set: number }) {
  const { sets } = useActiveSet();
  const setActiveSet = useSettings((state) => state.setSet);
  if (!sets.includes(set)) return null;
  return (
    // The newest set is stored as "follow the newest", so the site moves on at the next set launch.
    <Button onClick={() => setActiveSet(set === sets[0] ? null : set)}>
      <ArrowLeftRight /> Switch to Set {set}
    </Button>
  );
}
