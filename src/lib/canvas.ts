import { type Tier, TIERS } from "@/content/types";
import type { TraitStyle } from "@/lib/game/traits";

const TRAIT_STYLES: TraitStyle[] = ["inactive", "bronze", "silver", "gold", "prismatic", "unique"];

export interface Theme {
  background: string;
  card: string;
  border: string;
  foreground: string;
  muted: string;
  /** By star level, as the board shows them. */
  stars: Record<number, string>;
  /** By champion cost, 1–5. */
  cost: Record<number, string>;
  /** Each trait badge's frame and face gradient stops. */
  traitFrame: Record<TraitStyle, string[]>;
  traitFace: Record<TraitStyle, string[]>;
  /** Tier list letter colours. */
  tiers: Record<Tier, string>;
}

/** The colours in a CSS gradient, in order: `linear-gradient(170deg, oklch(…), oklch(…) 50%)` → the two oklch(…). */
export function colorStops(gradient: string): string[] {
  return gradient.match(/(?:oklch|oklab|lch|lab|rgba?|hsla?|color)\([^()]*\)/g) ?? [];
}

/**
 * The dark theme's colours, read from styles.css so exported images follow the site's palette. Images always
 * use the dark theme so shared screenshots look the same whatever theme the sharer had on.
 */
export function readDarkTheme(): Theme {
  const probe = document.createElement("div");
  probe.className = "dark";
  probe.hidden = true;
  document.body.append(probe);
  try {
    const style = getComputedStyle(probe);
    const token = (name: string) => style.getPropertyValue(`--${name}`).trim();
    const stops = (className: string) => {
      const element = document.createElement("span");
      element.className = className;
      probe.append(element);
      return colorStops(getComputedStyle(element).backgroundImage);
    };
    const byStyle = (prefix: string) =>
      Object.fromEntries(TRAIT_STYLES.map((name) => [name, stops(`${prefix}-${name}`)])) as Record<
        TraitStyle,
        string[]
      >;
    return {
      background: token("background"),
      card: token("card"),
      border: token("border"),
      foreground: token("foreground"),
      muted: token("muted-foreground"),
      stars: { 2: token("trait-silver"), 3: token("trait-gold") },
      cost: Object.fromEntries([1, 2, 3, 4, 5].map((cost) => [cost, token(`cost-${cost}`)])),
      traitFrame: byStyle("trait-frame"),
      traitFace: byStyle("trait-face"),
      tiers: Object.fromEntries(TIERS.map((tier) => [tier, token(`tier-${tier.toLowerCase()}`)])) as Record<
        Tier,
        string
      >,
    };
  } finally {
    probe.remove();
  }
}

/** A canvas drawn at 2x for sharp exports, with its context scaled so drawing uses CSS pixels. */
export function createImageCanvas(width: number, height: number) {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't supported in this browser.");
  ctx.scale(scale, scale);
  return { canvas, ctx };
}

/** The site's address, small and muted: exported images' footer, with its baseline at `y`. */
export function drawSiteAddress(ctx: CanvasRenderingContext2D, theme: Theme, font: string, x: number, y: number) {
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = theme.muted;
  ctx.font = `500 13px ${font}`;
  ctx.fillText(`${location.host}${import.meta.env.BASE_URL}`.replace(/\/$/, ""), x, y);
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't create the image."))), "image/png"),
  );
}

/** A file name from an image's title: "Set 18 · Level 8" → "set-18-level-8.png". */
export function imageFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "image"}.png`;
}

/** Loads each distinct image; ones that fail (offline, blocked) are left out and drawn without art. */
export async function loadImages(sources: (string | undefined)[]): Promise<Map<string, HTMLImageElement>> {
  const unique = [...new Set(sources.filter((source): source is string => Boolean(source)))];
  const loaded = await Promise.all(
    unique.map(
      (source) =>
        new Promise<[string, HTMLImageElement] | null>((resolve) => {
          const image = new Image();
          // CDragon serves CORS headers; without this the canvas would be tainted and couldn't be exported.
          image.crossOrigin = "anonymous";
          image.onload = () => resolve([source, image]);
          image.onerror = () => {
            console.warn(`Couldn't load ${source} for an exported image.`);
            resolve(null);
          };
          image.src = source;
        }),
    ),
  );
  return new Map(loaded.filter((entry) => entry !== null));
}

export function hexPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x + w / 2, y - h / 4);
  ctx.lineTo(x + w / 2, y + h / 4);
  ctx.lineTo(x, y + h / 2);
  ctx.lineTo(x - w / 2, y + h / 4);
  ctx.lineTo(x - w / 2, y - h / 4);
  ctx.closePath();
}

/** The in-game trait badge, as `TraitIcon` draws it: a metal frame and face with the icon in black. */
export function drawTraitBadge(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  x: number,
  y: number,
  style: TraitStyle,
  icon: HTMLImageElement | undefined,
  w = 28,
) {
  const h = w / 0.88;
  const gradient = (colors: string[]) => {
    const fill = ctx.createLinearGradient(x, y - h / 2, x, y + h / 2);
    colors.forEach((color, index) => fill.addColorStop(index / Math.max(colors.length - 1, 1), color));
    return fill;
  };
  hexPath(ctx, x, y, w, h);
  ctx.fillStyle = gradient(theme.traitFrame[style]);
  ctx.fill();
  hexPath(ctx, x, y, w * 0.82, h * 0.82);
  ctx.fillStyle = gradient(theme.traitFace[style]);
  ctx.fill();
  if (icon) {
    const size = w * 0.55;
    ctx.drawImage(tinted(icon, "black"), x - size / 2, y - size / 2, size, size);
  }
}

/** The image's shape filled with one colour, for monochrome icons. */
function tinted(image: HTMLImageElement, color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || 64;
  canvas.height = image.naturalHeight || 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}
