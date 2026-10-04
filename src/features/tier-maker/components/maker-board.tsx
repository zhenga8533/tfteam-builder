import {
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { createContext, type PointerEvent, use, useRef, useState } from "react";
import { AugmentIcon, ChampionIcon, ItemIcon, TraitIcon } from "@/components/game/icons";
import { SearchInput } from "@/components/layout/search-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Tier, type TierRows, TIERS } from "@/content/types";
import { TierBadge } from "@/features/comps/components/tier-badge";
import { TIER_BORDER } from "@/features/comps/styles";
import { matches } from "@/lib/search";
import { cn } from "@/lib/utils";
import { moveEntry, type Slot, tierOf } from "../model";
import type { MakerEntry } from "../use-maker-source";

const POOL = "pool";

/** What a drop lands on: a tier (null: the pool), before an entry or at the end. */
interface DropTarget {
  tier: Slot;
  before?: string;
}

/** Entries always show their name as text, so the icon itself is decorative. */
function EntryIcon({ entry, className }: { entry: MakerEntry; className?: string }) {
  switch (entry.kind) {
    case "champions":
      return <ChampionIcon champion={entry.champion} className={className} decorative />;
    case "items":
      return <ItemIcon item={entry.item} className={className} decorative />;
    case "traits":
      return <TraitIcon trait={entry.trait} style={entry.style} className={className} decorative />;
    case "augments":
      return <AugmentIcon augment={entry.augment} className={className} decorative />;
  }
}

interface BoardActions {
  move: (key: string, tier: Slot) => void;
  /** Takes the focus for `key` if it was just moved from its menu, so keyboard users keep their place. */
  claimFocus: (key: string, element: HTMLElement | null) => void;
  /** Whether the menu that just closed moved its entry, which refocuses itself; read once per close. */
  movingFromMenu: () => boolean;
  /** Whether a click is the tail end of a drag, which shouldn't open the entry's menu. */
  justDragged: () => boolean;
}

const BoardContext = createContext<BoardActions | null>(null);

function useBoard() {
  const actions = use(BoardContext);
  if (!actions) throw new Error("Tier list entries must be inside the maker board.");
  return actions;
}

/** An entry: drag it to another tier (or before another entry), or click it to pick a tier from a menu. */
function MakerEntryButton({ entry, slot }: { entry: MakerEntry; slot: Slot }) {
  const { move, justDragged, claimFocus, movingFromMenu } = useBoard();
  const [open, setOpen] = useState(false);
  const drag = useDraggable({ id: `entry:${entry.key}`, data: { key: entry.key } });
  const drop = useDroppable({
    id: `before:${entry.key}`,
    data: { tier: slot, before: entry.key } satisfies DropTarget,
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          ref={(node) => {
            drag.setNodeRef(node);
            drop.setNodeRef(node);
            claimFocus(entry.key, node);
          }}
          type="button"
          {...drag.attributes}
          {...drag.listeners}
          // The menu would open on pointer down and fight the drag, so a mouse or touch opens it on click instead.
          onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
            drag.listeners?.onPointerDown?.(event);
            event.preventDefault();
          }}
          onClick={() => !justDragged() && setOpen(true)}
          aria-label={`${entry.label}, ${slot ? `${slot} tier` : "unranked"}`}
          className={cn(
            "flex w-14 touch-none flex-col items-center gap-1 rounded-md p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring",
            drag.isDragging && "opacity-30",
            drop.isOver && !drag.isDragging && "ring-2 ring-primary",
          )}
        >
          <EntryIcon entry={entry} className="size-11" />
          <span className="line-clamp-2 text-center text-[10px] leading-tight text-muted-foreground">
            {entry.label}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-44"
        onCloseAutoFocus={(event) => movingFromMenu() && event.preventDefault()}
      >
        <DropdownMenuLabel className="truncate">{entry.label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={slot ?? POOL}
          onValueChange={(value) => move(entry.key, value === POOL ? null : (value as Tier))}
        >
          {TIERS.map((tier) => (
            <DropdownMenuRadioItem key={tier} value={tier}>
              {tier} tier
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuRadioItem value={POOL}>Unranked</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EntryList({ keys, byKey, slot }: { keys: string[]; byKey: Map<string, MakerEntry>; slot: Slot }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {keys.map((key) => {
        const entry = byKey.get(key);
        return (
          entry && (
            <li key={key}>
              <MakerEntryButton entry={entry} slot={slot} />
            </li>
          )
        );
      })}
    </ul>
  );
}

function TierRow({ tier, keys, byKey }: { tier: Tier; keys: string[]; byKey: Map<string, MakerEntry> }) {
  const { setNodeRef, isOver } = useDroppable({ id: `row:${tier}`, data: { tier } satisfies DropTarget });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${tier} tier`}
      className={cn(
        "flex min-h-20 gap-3 rounded-xl border bg-card/60 p-2.5 transition-colors",
        TIER_BORDER[tier],
        isOver && "bg-accent",
      )}
    >
      <TierBadge tier={tier} className="size-12 text-2xl" />
      {keys.length ? (
        <EntryList keys={keys} byKey={byKey} slot={tier} />
      ) : (
        <p className="self-center text-xs text-muted-foreground">Drag entries here</p>
      )}
    </section>
  );
}

function Pool({ keys, byKey, total }: { keys: string[]; byKey: Map<string, MakerEntry>; total: number }) {
  const [query, setQuery] = useState("");
  const { setNodeRef, isOver } = useDroppable({ id: `row:${POOL}`, data: { tier: null } satisfies DropTarget });
  const shown = keys.filter((key) => matches(byKey.get(key)?.label ?? key, query));
  return (
    <section
      ref={setNodeRef}
      aria-label="Unranked"
      className={cn("space-y-3 rounded-xl border border-dashed p-3 transition-colors", isOver && "bg-accent")}
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold">
          Unranked <span className="font-normal text-muted-foreground">({total})</span>
        </h2>
        <SearchInput value={query} onChange={setQuery} placeholder="Search unranked" className="max-w-xs" />
      </div>
      {shown.length ? (
        <div className="max-h-96 overflow-y-auto">
          <EntryList keys={shown} byKey={byKey} slot={null} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {total ? "Nothing matches that search." : "Everything is ranked."}
        </p>
      )}
    </section>
  );
}

/** Entry drop zones sit inside row drop zones; under the pointer, the entry wins so drops can reorder. */
const preferEntries: CollisionDetection = (args) =>
  pointerWithin(args).sort(
    (a, b) => Number(String(b.id).startsWith("before:")) - Number(String(a.id).startsWith("before:")),
  );

interface MakerBoardProps {
  entries: MakerEntry[];
  byKey: Map<string, MakerEntry>;
  rows: TierRows;
  onChange: (rows: TierRows) => void;
}

/** The S-to-X rows and the unranked pool, with drag and drop between them and a tier menu on every entry. */
export function MakerBoard({ entries, byKey, rows, onChange }: MakerBoardProps) {
  const [dragging, setDragging] = useState<MakerEntry | null>(null);
  const lastDrop = useRef(0);
  // An entry moved from its menu re-renders in another tier, so its old button (and focus) is gone.
  const refocus = useRef<string | null>(null);
  const menuMoved = useRef(false);
  const sensors = useSensors(
    // A small activation distance keeps clicks (which open the tier menu) working on draggable entries.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const pool = entries.filter((entry) => !tierOf(rows, entry.key)).map((entry) => entry.key);

  const actions: BoardActions = {
    move: (key, tier) => {
      if (tier === tierOf(rows, key)) return;
      refocus.current = key;
      menuMoved.current = true;
      onChange(moveEntry(rows, key, tier));
    },
    claimFocus: (key, element) => {
      if (!element || refocus.current !== key) return;
      refocus.current = null;
      element.focus();
    },
    movingFromMenu: () => {
      const moved = menuMoved.current;
      menuMoved.current = false;
      return moved;
    },
    justDragged: () => Date.now() - lastDrop.current < 250,
  };

  const onDragStart = ({ active }: DragStartEvent) =>
    setDragging(byKey.get((active.data.current as { key: string }).key) ?? null);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    lastDrop.current = Date.now();
    const key = (active.data.current as { key: string }).key;
    const target = over?.data.current as DropTarget | undefined;
    if (!target || target.before === key) return;
    onChange(moveEntry(rows, key, target.tier, target.before));
  };

  return (
    <BoardContext value={actions}>
      <DndContext
        sensors={sensors}
        collisionDetection={preferEntries}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="space-y-2">
          {TIERS.map((tier) => (
            <TierRow key={tier} tier={tier} keys={rows[tier] ?? []} byKey={byKey} />
          ))}
        </div>
        <Pool keys={pool} byKey={byKey} total={pool.length} />
        <DragOverlay dropAnimation={null}>
          {dragging && <EntryIcon entry={dragging} className="size-11 shadow-lg" />}
        </DragOverlay>
      </DndContext>
    </BoardContext>
  );
}
