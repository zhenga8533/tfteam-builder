import { useQuery } from "@tanstack/react-query";
import { type LinkProps, useNavigate } from "@tanstack/react-router";
import { FileText, Search } from "lucide-react";
import { type ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import { ChampionIcon, ItemIcon, TraitIcon } from "@/components/game/icons";
import { ITEM_KIND_LABELS } from "@/components/game/styles";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { compsForSet } from "@/content";
import { useActiveSet, useGameData } from "@/lib/data/hooks";
import { autoCompsQuery } from "@/lib/data/queries";
import { traitStyle } from "@/lib/game/traits";
import { cn } from "@/lib/utils";
import { isNavGroup, NAV } from "./nav";
import { OPEN_SEARCH } from "./open-search";

interface Entry {
  key: string;
  label: string;
  group: string;
  hint?: string;
  icon: ReactNode;
  link: Pick<LinkProps, "to" | "params">;
}

const PER_GROUP = 6;

/** 0 for a prefix match, 1 for a word-start match, 2 anywhere; null for no match. */
function matchRank(label: string, query: string): number | null {
  const text = label.toLowerCase();
  const index = text.indexOf(query);
  if (index === -1) return null;
  if (index === 0) return 0;
  return /[\s(&-]/.test(text[index - 1]!) ? 1 : 2;
}

const PAGES: Entry[] = NAV.flatMap((entry) =>
  isNavGroup(entry) ? entry.links.map((link) => ({ link, group: entry.label })) : [{ link: entry, group: "" }],
).map(({ link, group }) => ({
  key: `page:${String(link.to)}`,
  label: group ? `${group}: ${link.label}` : link.label,
  group: "Pages",
  hint: link.description,
  icon: <FileText className="size-5 text-muted-foreground" />,
  link: { to: link.to },
}));

function useEntries(): Entry[] {
  const { patch, set } = useActiveSet();
  const { champions, items, traits } = useGameData();
  // Not suspending: the palette works before (or without) detected comps.
  const autoComps = useQuery(autoCompsQuery(patch, set)).data?.comps;
  return useMemo(
    () => [
      ...champions.map((champion) => ({
        key: `champion:${champion.apiName}`,
        label: champion.name,
        group: "Champions",
        hint: `${champion.cost} cost`,
        icon: <ChampionIcon champion={champion} className="size-7" />,
        link: { to: "/champions/$apiName" as const, params: { apiName: champion.apiName } },
      })),
      ...items.map((item) => ({
        key: `item:${item.apiName}`,
        label: item.name,
        group: "Items",
        hint: ITEM_KIND_LABELS[item.kind],
        icon: <ItemIcon item={item} className="size-7" />,
        link: { to: "/items/$apiName" as const, params: { apiName: item.apiName } },
      })),
      ...traits.map((trait) => ({
        key: `trait:${trait.apiName}`,
        label: trait.name,
        group: "Traits",
        hint: trait.breakpoints.map((breakpoint) => breakpoint.minUnits).join(" / "),
        icon: <TraitIcon trait={trait} style={traitStyle(trait.breakpoints[0]?.style ?? 1)} className="size-7" />,
        link: { to: "/traits/$apiName" as const, params: { apiName: trait.apiName } },
      })),
      ...compsForSet(set).map((comp) => ({
        key: `guide:${comp.slug}`,
        label: comp.name,
        group: "Comps",
        hint: "Guide",
        icon: <FileText className="size-5 text-primary" />,
        link: { to: "/comps/$slug" as const, params: { slug: comp.slug } },
      })),
      ...(autoComps ?? []).map((comp) => ({
        key: `comp:${comp.id}`,
        label: comp.name,
        group: "Comps",
        hint: comp.tier ? `${comp.tier} tier` : "From stats",
        icon: <FileText className="size-5 text-muted-foreground" />,
        link: { to: "/comps/auto/$id" as const, params: { id: comp.id } },
      })),
      ...PAGES,
    ],
    [champions, items, traits, set, autoComps],
  );
}

function results(entries: Entry[], query: string): Entry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return entries.filter((entry) => entry.group === "Pages");
  const ranked = entries.flatMap((entry) => {
    const rank = matchRank(entry.label, needle);
    return rank === null ? [] : [{ entry, rank }];
  });
  const groups = Map.groupBy(
    ranked.sort((a, b) => a.rank - b.rank || a.entry.label.length - b.entry.label.length),
    ({ entry }) => entry.group,
  );
  return [...groups.values()].flatMap((group) => group.slice(0, PER_GROUP).map(({ entry }) => entry));
}

function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const entries = useEntries();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const shown = results(entries, query);
  const selected = Math.min(active, shown.length - 1);

  const open = (entry: Entry | undefined) => {
    if (!entry) return;
    onClose();
    void navigate(entry.link);
  };

  return (
    <div className="flex max-h-[70dvh] flex-col">
      <div className="flex items-center gap-2 border-b px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") setActive(Math.min(selected + 1, shown.length - 1));
            else if (event.key === "ArrowUp") setActive(Math.max(selected - 1, 0));
            else if (event.key === "Enter") open(shown[selected]);
            else return;
            event.preventDefault();
          }}
          placeholder="Search champions, items, traits, comps and pages"
          aria-label="Search the site"
          role="combobox"
          aria-expanded
          aria-controls="command-results"
          aria-activedescendant={shown[selected] ? `command-${shown[selected].key}` : undefined}
          className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <ul id="command-results" role="listbox" className="overflow-y-auto p-2">
        {shown.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nothing matches.</li>}
        {shown.map((entry, index) => (
          <li key={entry.key}>
            {(index === 0 || shown[index - 1]!.group !== entry.group) && (
              <p className="px-2 pt-2 pb-1 text-xs font-semibold text-muted-foreground">{entry.group}</p>
            )}
            <button
              id={`command-${entry.key}`}
              type="button"
              role="option"
              aria-selected={index === selected}
              onMouseMove={() => setActive(index)}
              onClick={() => open(entry)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm",
                index === selected && "bg-accent",
              )}
            >
              {entry.icon}
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              {entry.hint && <span className="truncate text-xs text-muted-foreground">{entry.hint}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** Site-wide search, opened from the header, with Ctrl/⌘ K (or "/" when not typing), or by `openSearch`. */
export function CommandSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const shortcut =
        (event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !isTyping(event.target));
      if (!shortcut) return;
      event.preventDefault();
      setOpen(true);
    };
    const onOpen = () => setOpen(true);
    addEventListener("keydown", onKey);
    addEventListener(OPEN_SEARCH, onOpen);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener(OPEN_SEARCH, onOpen);
    };
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-muted-foreground max-sm:size-8 max-sm:p-0"
        aria-label="Search"
      >
        <Search />
        <span className="max-sm:hidden">Search</span>
        <kbd className="rounded border bg-muted px-1 text-[10px] font-medium max-md:hidden">Ctrl K</kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
          <DialogTitle className="sr-only">Search</DialogTitle>
          {/* Its own boundary: the header's has no fallback, so suspending there would hide the search button. */}
          <Suspense fallback={<Skeleton className="m-3 h-9" />}>
            {open && <Palette onClose={() => setOpen(false)} />}
          </Suspense>
        </DialogContent>
      </Dialog>
    </>
  );
}
