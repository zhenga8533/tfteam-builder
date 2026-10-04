import { type TierRows, TIERS } from "@/content/types";
import {
  canvasToPng,
  createImageCanvas,
  drawSiteAddress,
  drawTraitBadge,
  loadImages,
  readDarkTheme,
} from "@/lib/canvas";
import type { MakerEntry } from "./use-maker-source";

const WIDTH = 1200;
const PADDING = 40;
const HEADER = 72;
const FOOTER = 36;
const BADGE = 64;
const ICON = 48;
const GAP = 6;
const ROW_GAP = 10;
const ROW_PADDING = 8;
const ICONS_LEFT = PADDING + BADGE + 16;
const PER_LINE = Math.floor((WIDTH - ICONS_LEFT - PADDING + GAP) / (ICON + GAP));

/** Lines of icons a tier needs, at least one so an empty tier still reads as a row. */
const tierLines = (count: number) => Math.max(1, Math.ceil(count / PER_LINE));

const rowHeight = (count: number) => Math.max(BADGE, tierLines(count) * (ICON + GAP) - GAP + ROW_PADDING * 2);

interface TierImageInput {
  title: string;
  subtitle: string;
  rows: TierRows;
  byKey: Map<string, MakerEntry>;
}

/** Draws each non-empty tier as a coloured letter and a wrapping row of icons, to a PNG. */
export async function renderTierListImage({ title, subtitle, rows, byKey }: TierImageInput): Promise<Blob> {
  const tiers = TIERS.flatMap((tier) => {
    const entries = (rows[tier] ?? []).flatMap((key) => byKey.get(key) ?? []);
    return entries.length ? [{ tier, entries }] : [];
  });
  const body = tiers.reduce((total, { entries }) => total + rowHeight(entries.length) + ROW_GAP, 0) - ROW_GAP;
  const height = PADDING * 2 + HEADER + Math.max(body, 0) + FOOTER;

  const { canvas, ctx } = createImageCanvas(WIDTH, height);
  await document.fonts.ready;
  const font = getComputedStyle(document.body).fontFamily;
  const theme = readDarkTheme();
  const images = await loadImages(tiers.flatMap(({ entries }) => entries.map((entry) => entry.image)));

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.fillStyle = theme.foreground;
  ctx.font = `700 30px ${font}`;
  ctx.fillText(title, PADDING, PADDING + 30);
  ctx.fillStyle = theme.muted;
  ctx.font = `500 16px ${font}`;
  ctx.fillText(subtitle, PADDING, PADDING + 58);

  let top = PADDING + HEADER;
  for (const { tier, entries } of tiers) {
    const rowTall = rowHeight(entries.length);
    ctx.fillStyle = theme.card;
    ctx.beginPath();
    ctx.roundRect(PADDING, top, WIDTH - PADDING * 2, rowTall, 12);
    ctx.fill();

    ctx.fillStyle = theme.tiers[tier];
    ctx.beginPath();
    ctx.roundRect(PADDING, top + (rowTall - BADGE) / 2, BADGE, BADGE, 10);
    ctx.fill();
    ctx.fillStyle = "rgb(0 0 0 / 0.8)";
    ctx.font = `700 32px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tier, PADDING + BADGE / 2, top + rowTall / 2 + 1);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";

    entries.forEach((entry, index) => {
      const x = ICONS_LEFT + (index % PER_LINE) * (ICON + GAP);
      const y = top + ROW_PADDING + Math.floor(index / PER_LINE) * (ICON + GAP);
      const image = images.get(entry.image);
      if (entry.kind === "traits") {
        drawTraitBadge(ctx, theme, x + ICON / 2, y + ICON / 2, entry.style, image, ICON * 0.88);
        return;
      }
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, ICON, ICON, 6);
      ctx.clip();
      ctx.fillStyle = theme.border;
      ctx.fillRect(x, y, ICON, ICON);
      if (image) ctx.drawImage(image, x, y, ICON, ICON);
      ctx.restore();
      if (entry.kind === "champions") {
        ctx.strokeStyle = theme.cost[entry.champion.cost] ?? theme.border;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x + 1.5, y + 1.5, ICON - 3, ICON - 3, 6);
        ctx.stroke();
      }
    });
    top += rowTall + ROW_GAP;
  }

  drawSiteAddress(ctx, theme, font, PADDING, height - PADDING / 2 - 4);
  return canvasToPng(canvas);
}
