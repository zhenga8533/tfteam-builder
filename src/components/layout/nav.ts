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
      { label: "Items", to: "/tierlist/items", description: "Best items to slam and build" },
      { label: "Augments", to: "/tierlist/augments", description: "Augment rankings by tier" },
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
    ],
  },
];

export const isNavGroup = (entry: NavLink | NavGroup): entry is NavGroup => "links" in entry;
