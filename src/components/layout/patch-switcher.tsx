import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveSet, useManifest } from "@/lib/data/hooks";
import { PATCHES } from "@/lib/data/constants";
import type { Patch } from "@/lib/data/schema";
import { useSettings } from "@/stores/settings";

const PATCH_LABELS: Record<Patch, string> = { latest: "Live", pbe: "PBE" };

export function PatchSwitcher() {
  const manifest = useManifest();
  const { patch, set, sets } = useActiveSet();
  const { setPatch, setSet } = useSettings();

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <Select value={patch} onValueChange={(value) => setPatch(value as Patch)}>
        <SelectTrigger size="sm" className="w-auto" aria-label="Patch">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PATCHES.map((value) => (
            <SelectItem key={value} value={value}>
              {PATCH_LABELS[value]}{" "}
              <span className="text-muted-foreground max-sm:hidden">{manifest.patches[value].label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(set)} onValueChange={(value) => setSet(Number(value) === sets[0] ? null : Number(value))}>
        <SelectTrigger size="sm" className="w-auto" aria-label="Set">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sets.map((value) => (
            <SelectItem key={value} value={String(value)}>
              Set {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
