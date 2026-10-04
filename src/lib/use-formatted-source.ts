import { useEffect, useState } from "react";
import { formatContentSource } from "@/content/serialize";

/**
 * `source` formatted like the repository's files, or null while that's in progress. Only runs while `active`
 * (e.g. its dialog is open), since formatting loads Prettier, which is large.
 */
export function useFormattedSource(source: string, active: boolean): string | null {
  // Kept with the source it came from, so an edit never shows (or copies) the previous version.
  const [formatted, setFormatted] = useState<{ source: string; text: string } | null>(null);
  useEffect(() => {
    if (!active) return;
    let current = true;
    formatContentSource(source).then(
      (text) => current && setFormatted({ source, text }),
      (error: unknown) => {
        console.error("Couldn't format the file.", error);
        if (current) setFormatted({ source, text: source });
      },
    );
    return () => {
      current = false;
    };
  }, [source, active]);
  return formatted?.source === source ? formatted.text : null;
}
