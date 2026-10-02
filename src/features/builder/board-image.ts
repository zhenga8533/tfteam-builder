import type { Champion, Item } from "@/lib/data/schema";
import { BOARD_COLS, type Board, boardUnits } from "@/lib/game/board";
import type { TraitState, TraitStyle } from "@/lib/game/traits";

// The image always uses the dark theme's colours (styles.css) so shared screenshots look the same whatever
// theme the sharer had on.
const COLORS = {
  background: "oklch(0.16 0.02 265)",
  card: "oklch(0.2 0.025 265)",
  border: "oklch(0.3 0.03 265)",
  foreground: "oklch(0.95 0.01 265)",
  muted: "oklch(0.7 0.02 265)",
  star: "oklch(0.83 0.14 85)",
  cost: [
    "",
    "oklch(0.7 0.01 265)",
    "oklch(0.72 0.17 150)",
    "oklch(0.68 0.16 250)",
    "oklch(0.65 0.22 310)",
    "oklch(0.82 0.15 80)",
  ],
};

const TRAIT_FRAME: Record<TraitStyle, [string, string]> = {
  inactive: ["oklch(0.42 0.015 265)", "oklch(0.27 0.015 265)"],
  bronze: ["oklch(0.8 0.08 60)", "oklch(0.48 0.08 45)"],
  silver: ["oklch(0.93 0.015 240)", "oklch(0.58 0.025 245)"],
  gold: ["oklch(0.94 0.1 95)", "oklch(0.62 0.12 75)"],
  prismatic: ["oklch(0.95 0.06 200)", "oklch(0.75 0.14 320)"],
  unique: ["oklch(0.88 0.11 55)", "oklch(0.55 0.16 35)"],
};

const TRAIT_FACE: Record<TraitStyle, [string, string]> = {
  inactive: ["oklch(0.27 0.015 265)", "oklch(0.2 0.015 265)"],
  bronze: ["oklch(0.67 0.1 55)", "oklch(0.52 0.09 45)"],
  silver: ["oklch(0.8 0.02 240)", "oklch(0.63 0.025 245)"],
  gold: ["oklch(0.84 0.14 88)", "oklch(0.68 0.13 75)"],
  prismatic: ["oklch(0.88 0.1 330)", "oklch(0.9 0.1 95)"],
  unique: ["oklch(0.74 0.16 45)", "oklch(0.6 0.17 35)"],
};

const SCALE = 2;
const PADDING = 40;
const HEADER = 72;
const FOOTER = 36;
const HEX_W = 96;
const HEX_H = HEX_W / 0.866;
const HEX_GAP = 6;
const TRAIT_COLUMN = 260;
const TRAIT_ROW = 40;
const ITEM_SIZE = 26;

/** Centre of a board hex: pointy-top hexes, with every second row shifted half a hex right (as on the board). */
export function hexCenter(index: number): { x: number; y: number } {
  const row = Math.floor(index / BOARD_COLS);
  const col = index % BOARD_COLS;
  const step = HEX_W + HEX_GAP;
  return {
    x: col * step + (row % 2 ? step / 2 : 0) + HEX_W / 2,
    y: row * (HEX_H * 0.75 + HEX_GAP * 0.866) + HEX_H / 2,
  };
}

const BOARD_WIDTH = BOARD_COLS * (HEX_W + HEX_GAP) + (HEX_W + HEX_GAP) / 2;
const BOARD_HEIGHT = hexCenter(BOARD_COLS * 3).y + HEX_H / 2;

/** A file name for the image from its title: "Set 18 · Level 8" → "set-18-level-8.png". */
export function imageFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "team"}.png`;
}

export interface BoardImageInput {
  title: string;
  subtitle: string;
  board: Board;
  traits: TraitState[];
  championsByApi: Map<string, Champion>;
  itemsByApi: Map<string, Item>;
}

/** Draws the board, its units' stars and items, and the active traits to a PNG. */
export async function renderBoardImage(input: BoardImageInput): Promise<Blob> {
  const traits = input.traits.filter((state) => state.count > 0 && state.activeIndex >= 0);
  const width = PADDING * 3 + BOARD_WIDTH + TRAIT_COLUMN;
  const height = HEADER + Math.max(BOARD_HEIGHT, traits.length * TRAIT_ROW) + FOOTER + PADDING * 2;

  const canvas = document.createElement("canvas");
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't supported in this browser.");
  ctx.scale(SCALE, SCALE);
  await document.fonts.ready;
  const font = getComputedStyle(document.body).fontFamily;

  const images = await loadImages([
    ...boardUnits(input.board).flatMap((unit) => [
      input.championsByApi.get(unit.apiName)?.icon,
      ...unit.items.map((item) => input.itemsByApi.get(item)?.icon),
    ]),
    ...traits.map((state) => state.trait.icon),
  ]);

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLORS.foreground;
  ctx.font = `700 30px ${font}`;
  ctx.fillText(input.title, PADDING, PADDING + 30);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 16px ${font}`;
  ctx.fillText(input.subtitle, PADDING, PADDING + 58);

  const boardTop = PADDING + HEADER;
  input.board.forEach((unit, index) => {
    const center = hexCenter(index);
    const x = PADDING + center.x;
    const y = boardTop + center.y;
    const champion = unit && input.championsByApi.get(unit.apiName);
    hexPath(ctx, x, y, HEX_W, HEX_H);
    ctx.fillStyle = COLORS.card;
    ctx.fill();
    if (!unit || !champion) {
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      return;
    }

    const icon = images.get(champion.icon);
    if (icon) {
      ctx.save();
      hexPath(ctx, x, y, HEX_W, HEX_H);
      ctx.clip();
      const size = Math.max(HEX_W, HEX_H);
      ctx.drawImage(icon, x - size / 2, y - size / 2, size, size);
      ctx.restore();
    }
    hexPath(ctx, x, y, HEX_W - 3, HEX_H - 3);
    ctx.strokeStyle = COLORS.cost[champion.cost] ?? COLORS.border;
    ctx.lineWidth = 4;
    ctx.stroke();
    if (unit.flex) {
      ctx.globalAlpha = 0.35;
      hexPath(ctx, x, y, HEX_W, HEX_H);
      ctx.fillStyle = COLORS.background;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (unit.star > 1) drawStars(ctx, x, y - HEX_H / 2 + 14, unit.star);
    const items = unit.items.flatMap((apiName) => {
      const image = images.get(input.itemsByApi.get(apiName)?.icon ?? "");
      return image ? [image] : [];
    });
    const itemsLeft = x - (items.length * ITEM_SIZE + (items.length - 1) * 2) / 2;
    items.forEach((image, i) => {
      const left = itemsLeft + i * (ITEM_SIZE + 2);
      const top = y + HEX_H / 2 - ITEM_SIZE - 14;
      ctx.drawImage(image, left, top, ITEM_SIZE, ITEM_SIZE);
      ctx.strokeStyle = COLORS.background;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(left, top, ITEM_SIZE, ITEM_SIZE);
    });
  });

  const traitsLeft = PADDING * 2 + BOARD_WIDTH;
  traits.forEach((state, i) => {
    const top = boardTop + i * TRAIT_ROW;
    drawTraitBadge(ctx, traitsLeft + 15, top + 16, state.style, images.get(state.trait.icon));
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.foreground;
    ctx.font = `600 16px ${font}`;
    const count = String(state.count);
    ctx.fillText(count, traitsLeft + 40, top + 17);
    ctx.font = `500 16px ${font}`;
    ctx.fillText(state.trait.name, traitsLeft + 48 + ctx.measureText(count).width, top + 17);
  });

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 13px ${font}`;
  ctx.fillText(`${location.host}${import.meta.env.BASE_URL}`.replace(/\/$/, ""), PADDING, height - PADDING / 2 - 4);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't create the image."))), "image/png"),
  );
}

/** Loads each distinct image; ones that fail (offline, blocked) are left out and drawn without art. */
async function loadImages(sources: (string | undefined)[]): Promise<Map<string, HTMLImageElement>> {
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
            console.warn(`Couldn't load ${source} for the board image.`);
            resolve(null);
          };
          image.src = source;
        }),
    ),
  );
  return new Map(loaded.filter((entry) => entry !== null));
}

function hexPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x + w / 2, y - h / 4);
  ctx.lineTo(x + w / 2, y + h / 4);
  ctx.lineTo(x, y + h / 2);
  ctx.lineTo(x - w / 2, y + h / 4);
  ctx.lineTo(x - w / 2, y - h / 4);
  ctx.closePath();
}

function drawStars(ctx: CanvasRenderingContext2D, x: number, y: number, stars: number) {
  const size = 9;
  const left = x - ((stars - 1) * size * 2) / 2;
  for (let i = 0; i < stars; i++) {
    const cx = left + i * size * 2;
    ctx.beginPath();
    for (let point = 0; point < 10; point++) {
      const radius = point % 2 ? size * 0.45 : size;
      const angle = (Math.PI / 5) * point - Math.PI / 2;
      ctx.lineTo(cx + radius * Math.cos(angle), y + radius * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fillStyle = COLORS.star;
    ctx.fill();
    ctx.strokeStyle = COLORS.background;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/** The in-game trait badge, as `TraitIcon` draws it: a metal frame and face with the icon in black. */
function drawTraitBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  style: TraitStyle,
  icon: HTMLImageElement | undefined,
) {
  const w = 28;
  const h = w / 0.88;
  const gradient = ([from, to]: [string, string]) => {
    const fill = ctx.createLinearGradient(x, y - h / 2, x, y + h / 2);
    fill.addColorStop(0, from);
    fill.addColorStop(1, to);
    return fill;
  };
  hexPath(ctx, x, y, w, h);
  ctx.fillStyle = gradient(TRAIT_FRAME[style]);
  ctx.fill();
  hexPath(ctx, x, y, w * 0.82, h * 0.82);
  ctx.fillStyle = gradient(TRAIT_FACE[style]);
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
