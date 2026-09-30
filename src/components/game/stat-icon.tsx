import { cn } from "@/lib/utils";
import { STAT_ICONS, type Stat } from "./stats";

export function StatIcon({ stat, className }: { stat: Stat; className?: string }) {
  return <img src={STAT_ICONS[stat]} alt="" className={cn("inline-block size-3.5 align-[-0.15em]", className)} />;
}
