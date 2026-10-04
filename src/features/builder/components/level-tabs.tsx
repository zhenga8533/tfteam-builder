import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MAX_LEVEL, MIN_LEVEL } from "@/lib/game/board";
import { useBuilder } from "../use-builder";

const LEVELS = Array.from({ length: MAX_LEVEL - MIN_LEVEL + 1 }, (_, i) => MIN_LEVEL + i);

/** One tab per level board (e.g. level 6 early, level 8 final), with controls to add, relevel or remove. */
export function LevelTabs() {
  const { boards, active, level, showLevel, addLevel, changeLevel, removeLevel } = useBuilder();
  const used = new Set(boards.map((entry) => entry.level));
  const free = LEVELS.filter((value) => !used.has(value));

  return (
    <div className="flex flex-wrap items-center gap-1">
      <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Boards by level">
        {boards.map((entry, index) =>
          index === active ? (
            <DropdownMenu key={entry.level}>
              <DropdownMenuTrigger asChild>
                <Button role="tab" aria-selected size="sm" variant="secondary" className="gap-1 ring-1 ring-primary/60">
                  Level {entry.level}
                  <ChevronDown className="opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Change level</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={String(level)} onValueChange={(value) => changeLevel(Number(value))}>
                      {LEVELS.map((value) => (
                        <DropdownMenuRadioItem
                          key={value}
                          value={String(value)}
                          disabled={value !== level && used.has(value)}
                        >
                          Level {value}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={removeLevel} disabled={boards.length < 2}>
                  <Trash2 /> Remove this board
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              key={entry.level}
              role="tab"
              aria-selected={false}
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => showLevel(index)}
            >
              Level {entry.level}
            </Button>
          ),
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="size-8" disabled={free.length === 0} aria-label="Add a level">
            <Plus />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Starts as a copy of level {level}
          </DropdownMenuLabel>
          {free.map((value) => (
            <DropdownMenuItem key={value} onSelect={() => addLevel(value)}>
              Level {value} board
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
