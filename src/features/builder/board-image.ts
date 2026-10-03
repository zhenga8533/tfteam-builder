import type { Champion, Item } from "@/lib/data/schema";
import { BOARD_COLS, type Board, type BoardUnit, boardUnits } from "@/lib/game/board";
import { isUniqueTrait, pickCarries } from "@/lib/game/comp-signature";
import { STYLE_RANK, type TraitState } from "@/lib/game/traits";
import {
  canvasToPng,
  createImageCanvas,
  drawTraitBadge,
  hexPath,
  loadImages,
  readDarkTheme,
  type Theme,
} from "@/lib/canvas";

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

/** Names a board like a detected comp, by its main trait and carries ("Blossom Ahri"); null when it has neither. */
export function boardTitle(
  units: BoardUnit[],
  traits: TraitState[],
  championsByApi: Map<string, Champion>,
): string | null {
  const carries = pickCarries(
    units
      .filter((unit) => !unit.flex)
      .map((unit) => ({
        apiName: unit.apiName,
        items: unit.items.length,
        cost: championsByApi.get(unit.apiName)?.cost ?? 0,
      })),
  ).map((apiName) => championsByApi.get(apiName)?.name ?? apiName);
  const rank = (state: TraitState) => STYLE_RANK[state.style] * 100 + state.count;
  const [first, second] = traits
    .filter((state) => state.count > 0 && state.activeIndex >= 0 && !isUniqueTrait(state.trait))
    .sort((a, b) => rank(b) - rank(a));
  // A tie (say, a spread of 2-unit traits) has no main trait; picking one would be arbitrary.
  const main = first && (!second || rank(first) > rank(second)) ? first.trait.name : undefined;
  return [main, carries.join(" & ")].filter(Boolean).join(" ") || null;
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

  const { canvas, ctx } = createImageCanvas(width, height);
  await document.fonts.ready;
  const font = getComputedStyle(document.body).fontFamily;
  const theme = readDarkTheme();

  const images = await loadImages([
    ...boardUnits(input.board).flatMap((unit) => [
      input.championsByApi.get(unit.apiName)?.icon,
      ...unit.items.map((item) => input.itemsByApi.get(item)?.icon),
    ]),
    ...traits.map((state) => state.trait.icon),
  ]);

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = theme.foreground;
  ctx.font = `700 30px ${font}`;
  ctx.fillText(input.title, PADDING, PADDING + 30);
  ctx.fillStyle = theme.muted;
  ctx.font = `500 16px ${font}`;
  ctx.fillText(input.subtitle, PADDING, PADDING + 58);

  const boardTop = PADDING + HEADER;
  input.board.forEach((unit, index) => {
    const center = hexCenter(index);
    const x = PADDING + center.x;
    const y = boardTop + center.y;
    const champion = unit && input.championsByApi.get(unit.apiName);
    hexPath(ctx, x, y, HEX_W, HEX_H);
    ctx.fillStyle = theme.card;
    ctx.fill();
    if (!unit || !champion) {
      ctx.strokeStyle = theme.border;
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
    ctx.strokeStyle = theme.cost[champion.cost] ?? theme.border;
    ctx.lineWidth = 4;
    ctx.stroke();
    if (unit.flex) {
      ctx.globalAlpha = 0.35;
      hexPath(ctx, x, y, HEX_W, HEX_H);
      ctx.fillStyle = theme.background;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (unit.star > 1) drawStars(ctx, theme, x, y - HEX_H / 2 + 14, unit.star);
    const items = unit.items.flatMap((apiName) => {
      const image = images.get(input.itemsByApi.get(apiName)?.icon ?? "");
      return image ? [image] : [];
    });
    const itemsLeft = x - (items.length * ITEM_SIZE + (items.length - 1) * 2) / 2;
    items.forEach((image, i) => {
      const left = itemsLeft + i * (ITEM_SIZE + 2);
      const top = y + HEX_H / 2 - ITEM_SIZE - 14;
      ctx.drawImage(image, left, top, ITEM_SIZE, ITEM_SIZE);
      ctx.strokeStyle = theme.background;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(left, top, ITEM_SIZE, ITEM_SIZE);
    });
  });

  const traitsLeft = PADDING * 2 + BOARD_WIDTH;
  traits.forEach((state, i) => {
    const top = boardTop + i * TRAIT_ROW;
    drawTraitBadge(ctx, theme, traitsLeft + 15, top + 16, state.style, images.get(state.trait.icon));
    ctx.textBaseline = "middle";
    ctx.fillStyle = theme.foreground;
    ctx.font = `600 16px ${font}`;
    const count = String(state.count);
    ctx.fillText(count, traitsLeft + 40, top + 17);
    ctx.font = `500 16px ${font}`;
    ctx.fillText(state.trait.name, traitsLeft + 48 + ctx.measureText(count).width, top + 17);
  });

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = theme.muted;
  ctx.font = `500 13px ${font}`;
  ctx.fillText(`${location.host}${import.meta.env.BASE_URL}`.replace(/\/$/, ""), PADDING, height - PADDING / 2 - 4);

  return canvasToPng(canvas);
}

function drawStars(ctx: CanvasRenderingContext2D, theme: Theme, x: number, y: number, stars: number) {
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
    ctx.fillStyle = theme.stars[stars] ?? theme.foreground;
    ctx.fill();
    ctx.strokeStyle = theme.background;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
