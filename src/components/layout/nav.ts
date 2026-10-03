import type { LinkProps } from "@tanstack/react-router";

export interface NavLink {
  label: string;
  to: LinkProps["to"];
  description?: string;
}

export interface NavGroup {
  label: string;
  links: NavLink[];
}

export const NAV: (NavLink | NavGroup)[] = [
  {
    label: "Tier List",
    links: [
      { label: "Comps", to: "/tierlist/comps", description: "The strongest team comps this patch" },
      { label: "Champions", to: "/tierlist/champions", description: "Units ranked by average placement" },
      { label: "Items", to: "/tierlist/items", description: "Best items to slam and build" },
      { label: "Traits", to: "/tierlist/traits", description: "Trait breakpoints ranked by placement" },
      { label: "Augments", to: "/tierlist/augments", description: "Augment rankings by tier" },
      { label: "Patch Changes", to: "/tierlist/changes", description: "What got better or worse this patch" },
    ],
  },
  { label: "Team Builder", to: "/builder" },
  {
    label: "Database",
    links: [
      { label: "Champions", to: "/champions", description: "Abilities, stats and traits" },
      { label: "Traits", to: "/traits", description: "Breakpoints and bonuses" },
      { label: "Items", to: "/items", description: "Recipes and effects" },
      { label: "Augments", to: "/augments", description: "Silver, gold and prismatic" },
      { label: "Little Legends", to: "/little-legends", description: "Most popular in ranked" },
    ],
  },
  {
    label: "Tools",
    links: [
      { label: "Explorer", to: "/explorer", description: "Filter ranked boards and see what wins" },
      { label: "Compare", to: "/compare", description: "Two champions, items or comps side by side" },
      { label: "Roll Odds", to: "/tools/rolling", description: "Your chance to hit a 2★ or 3★" },
      { label: "Component Planner", to: "/tools/components", description: "What your components build into" },
    ],
  },
];

export const isNavGroup = (entry: NavLink | NavGroup): entry is NavGroup => "links" in entry;
