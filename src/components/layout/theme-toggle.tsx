import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Theme, THEMES, useSettings } from "@/stores/settings";

const THEME_OPTIONS: Record<Theme, { label: string; icon: typeof Sun }> = {
  system: { label: "System", icon: Monitor },
  light: { label: "Light", icon: Sun },
  dark: { label: "Dark", icon: Moon },
};

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Keeps the `dark` class on <html> in line with the setting, following the OS while it's "system". */
function useApplyTheme(theme: Theme) {
  useEffect(() => {
    const media = matchMedia(DARK_QUERY);
    const apply = () =>
      document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && media.matches));
    apply();
    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
}

export function ThemeToggle() {
  const { theme, setTheme } = useSettings();
  useApplyTheme(theme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Theme">
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
          {THEMES.map((value) => {
            const { label, icon: Icon } = THEME_OPTIONS[value];
            return (
              <DropdownMenuRadioItem key={value} value={value}>
                <Icon /> {label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
