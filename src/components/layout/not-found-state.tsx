import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { openSearch } from "./open-search";

/** A page with nothing to show: what's missing, why, and where to go instead (`children`, as buttons). */
export function NotFoundState({
  icon: Icon,
  title,
  description,
  children,
  footer,
  heading: Heading = "h1",
}: {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  children?: ReactNode;
  /** Below the actions, e.g. quick links. */
  footer?: ReactNode;
  /** `h2` when the page already has its own heading. */
  heading?: "h1" | "h2";
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center sm:py-24">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-7" />
      </span>
      <div className="space-y-1.5">
        <Heading className="font-display text-2xl font-bold tracking-tight">{title}</Heading>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex flex-wrap justify-center gap-2">{children}</div>}
      {footer}
    </div>
  );
}

/** Opens the site-wide search, for a not-found page's actions. */
export function SearchButton() {
  return (
    <Button variant="outline" onClick={openSearch}>
      <Search /> Search
    </Button>
  );
}
