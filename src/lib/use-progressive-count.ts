import { startTransition, useEffect, useState } from "react";

/**
 * How many items of a long list to render: a first screenful straight away, then more in batches between frames,
 * so a page with many heavy cards never freezes for long. Every item still ends up rendered (find-in-page and
 * screen readers see them all).
 */
export function useProgressiveCount(total: number, first = 12, batch = 12): number {
  const [count, setCount] = useState(first);
  useEffect(() => {
    if (count >= total) return;
    const timer = setTimeout(() => startTransition(() => setCount((current) => current + batch)), 0);
    return () => clearTimeout(timer);
  }, [count, total, batch]);
  return Math.min(count, total);
}
