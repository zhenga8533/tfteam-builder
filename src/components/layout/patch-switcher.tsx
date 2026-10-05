import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PATCHES } from "@/lib/data/constants";
import { resolveActiveSet } from "@/lib/data/active-set";
import { useActiveSet, useManifest } from "@/lib/data/hooks";
import type { Patch } from "@/lib/data/schema";
import { useSettings } from "@/stores/settings";

const PATCH_NAMES: Record<Patch, { name: string; hint: string }> = {
  latest: { name: "Live", hint: "The current patch on live servers" },
  pbe: { name: "PBE", hint: "Upcoming changes on the test server" },
};

/** One control for which game data the site shows: live or PBE, and which set. */
export function PatchSwitcher() {
  const manifest = useManifest();
  const { patch, set, sets, label } = useActiveSet();
  const settings = useSettings();
  const { setPatch, setSet } = settings;
  const newest = sets[0];
  // `useActiveSet` lags behind a switch until the new set's data has loaded.
  const chosen = resolveActiveSet(manifest, settings.patch, settings.set);
  const loading = chosen.patch !== patch || chosen.set !== set;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          aria-label={`Set ${set}, ${PATCH_NAMES[patch].name} ${label}`}
          aria-busy={loading}
        >
          <span className="font-semibold">Set {set}</span>
          <span className="text-muted-foreground max-sm:hidden">· {label}</span>
          {patch === "pbe" && (
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-primary">
              PBE
            </span>
          )}
          {loading ? (
            <Loader2 className="size-3.5 animate-spin opacity-60" />
          ) : (
            <ChevronDown className="size-3.5 opacity-60" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Game data</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={patch} onValueChange={(value) => setPatch(value as Patch)}>
          {PATCHES.map((value) => (
            <DropdownMenuRadioItem key={value} value={value} className="flex-col items-start gap-0">
              <span className="flex w-full items-baseline justify-between gap-3">
                <span className="font-medium">{PATCH_NAMES[value].name}</span>
                <span className="text-muted-foreground tabular-nums">{manifest.patches[value].label}</span>
              </span>
              <span className="text-xs text-muted-foreground">{PATCH_NAMES[value].hint}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Set</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={String(set)}
          // The newest set is stored as "follow the newest", so the site moves on at the next set launch.
          onValueChange={(value) => setSet(Number(value) === newest ? null : Number(value))}
        >
          <div className="max-h-64 overflow-y-auto">
            {sets.map((value) => (
              <DropdownMenuRadioItem key={value} value={String(value)}>
                <span className="flex w-full items-baseline justify-between gap-3">
                  <span>Set {value}</span>
                  {value === newest && <span className="text-xs text-primary">Current</span>}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </div>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
