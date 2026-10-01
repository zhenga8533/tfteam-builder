import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu } from "lucide-react";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { isNavGroup, NAV } from "./nav";
import { PatchSwitcher } from "./patch-switcher";
import { ThemeToggle } from "./theme-toggle";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
      <img src={`${import.meta.env.BASE_URL}tft-logo.svg`} alt="" className="size-7" />
      <span>
        TFTeam<span className="text-primary">.</span>
      </span>
    </Link>
  );
}

const navLinkClass =
  "inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:text-foreground";

function DesktopNav() {
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
      {NAV.map((entry) =>
        isNavGroup(entry) ? (
          <DropdownMenu key={entry.label}>
            <DropdownMenuTrigger className={navLinkClass}>
              {entry.label}
              <ChevronDown className="size-3.5 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {entry.links.map((link) => (
                <DropdownMenuItem key={link.label} asChild>
                  <Link to={link.to} className="flex flex-col items-start gap-0.5">
                    <span className="font-medium">{link.label}</span>
                    {link.description && <span className="text-xs text-muted-foreground">{link.description}</span>}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link key={entry.label} to={entry.to} className={navLinkClass}>
            {entry.label}
          </Link>
        ),
      )}
    </nav>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle asChild>
            <div>
              <Logo />
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-4 px-4" aria-label="Main">
          {NAV.map((entry) =>
            isNavGroup(entry) ? (
              <div key={entry.label} className="flex flex-col gap-1">
                <span className="px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {entry.label}
                </span>
                {entry.links.map((link) => (
                  <Link key={link.label} to={link.to} onClick={close} className={navLinkClass}>
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link key={entry.label} to={entry.to} onClick={close} className={navLinkClass}>
                {entry.label}
              </Link>
            ),
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <MobileNav />
        <Logo />
        <DesktopNav />
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Suspense>
            <PatchSwitcher />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
