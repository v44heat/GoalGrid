// Client-only helpers for drawing shareable PNG cards on a <canvas>.
// Rendering happens in the browser, so the server stays free and images match what people see.

import type { TeamArt } from "@/types/graphics";

export const COLORS = {
  bg: "#07140e",
  bg2: "#0b1d14",
  panel: "#102a1d",
  panel2: "#173a28",
  line: "#21503a",
  chalk: "#eef3ea",
  dim: "#a9b8ac",
  faint: "#6f8476",
  grass: "#3fdc7f",
  gold: "#f2c14e",
  red: "#ff7b80",
} as const;

export interface Fonts {
  display: string;
  body: string;
}

/** Reads the fonts the site already loaded (next/font exposes them as CSS variables). */
export async function loadFonts(): Promise<Fonts> {
  const cs = getComputedStyle(document.documentElement);
  const display = `${cs.getPropertyValue("--font-display").trim() || "Impact"}, "Arial Narrow", sans-serif`;
  const body = `${cs.getPropertyValue("--font-body").trim() || "Arial"}, Arial, sans-serif`;
  try {
    await Promise.all([
      document.fonts.load(`700 48px ${display}`),
      document.fonts.load(`600 48px ${display}`),
      document.fonts.load(`400 24px ${body}`),
      document.fonts.load(`600 24px ${body}`),
    ]);
  } catch {
    // Fall back to whatever is installed; the card still renders.
  }
  return { display, body };
}

/**
 * Loads a logo. Resolves to null on any failure (404, blocked, no CORS) so the caller can draw
 * the initials badge instead. `anonymous` CORS also keeps the canvas exportable.
 */
export function loadImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function loadLogos(teams: (TeamArt | null)[]): Promise<Map<string, HTMLImageElement | null>> {
  const urls = Array.from(new Set(teams.map((t) => t?.logoUrl).filter((u): u is string => Boolean(u))));
  return Promise.all(urls.map(async (u) => [u, await loadImage(u)] as const)).then((e) => new Map(e));
}

export function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  return { canvas, ctx };
}

export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing is not in every browser yet; ignoring it only makes headings a touch tighter.
  (ctx as unknown as { letterSpacing?: string }).letterSpacing = `${px}px`;
}

export function font(weight: number, px: number, family: string) {
  return `${weight} ${px}px ${family}`;
}

/** Largest size (stepping down) at which `text` fits `maxWidth`. */
export function fitSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  weight: number,
  startPx: number,
  minPx: number,
  maxWidth: number,
  spacing = 0
): number {
  ctx.save();
  setSpacing(ctx, spacing); // measure with the spacing the text will be drawn with
  let result = minPx;
  for (let px = startPx; px > minPx; px -= 2) {
    ctx.font = font(weight, px, family);
    if (ctx.measureText(text).width <= maxWidth) {
      result = px;
      break;
    }
  }
  ctx.restore();
  return result;
}

export function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

export interface TextOpts {
  font: string;
  color: string;
  align?: CanvasTextAlign;
  spacing?: number;
  maxWidth?: number;
}

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, o: TextOpts) {
  ctx.save();
  ctx.font = o.font;
  ctx.fillStyle = o.color;
  ctx.textAlign = o.align ?? "left";
  ctx.textBaseline = "middle";
  setSpacing(ctx, o.spacing ?? 0);
  const out = o.maxWidth ? ellipsize(ctx, text, o.maxWidth) : text;
  ctx.fillText(out, x, y);
  ctx.restore();
}

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, COLORS.bg2);
  g.addColorStop(1, COLORS.bg);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // soft floodlight glow behind the header
  const glow = ctx.createRadialGradient(w / 2, 0, 10, w / 2, 0, w * 0.8);
  glow.addColorStop(0, "rgba(63,220,127,0.20)");
  glow.addColorStop(1, "rgba(63,220,127,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // faint pitch markings: halfway line and centre circle
  ctx.save();
  ctx.strokeStyle = "rgba(63,220,127,0.07)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.62);
  ctx.lineTo(w, h * 0.62);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.62, w * 0.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // top accent bar
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, w, 10);
}

export function drawHeader(
  ctx: CanvasRenderingContext2D,
  w: number,
  fonts: Fonts,
  seasonName: string,
  y1 = 86,
  y2 = 146
) {
  drawText(ctx, "EFOOTBALL LEAGUE", w / 2, y1, {
    font: font(700, 54, fonts.display),
    color: COLORS.chalk,
    align: "center",
    spacing: 6,
  });
  const season = seasonName.toUpperCase();
  const size = fitSize(ctx, season, fonts.display, 600, 42, 24, w - 160, 3);
  drawText(ctx, season, w / 2, y2, {
    font: font(600, size, fonts.display),
    color: COLORS.grass,
    align: "center",
    spacing: 3,
    maxWidth: w - 160, // last resort: shorten with an ellipsis instead of running off the card
  });
}

export function drawFooter(ctx: CanvasRenderingContext2D, w: number, h: number, fonts: Fonts, note?: string) {
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(60, h - 90, w - 120, 2);
  drawText(ctx, note ?? "EFOOTBALL LEAGUE", w / 2, h - 52, {
    font: font(500, 22, fonts.body),
    color: COLORS.faint,
    align: "center",
    spacing: 2,
  });
}

/** Team logo on a soft plate, or an initials badge when there is no (loadable) logo. */
export function drawBadge(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null | undefined,
  team: TeamArt | null,
  cx: number,
  cy: number,
  size: number,
  fonts: Fonts
) {
  const r = size / 2;
  ctx.save();
  if (logo) {
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    const box = size * 0.82;
    const scale = Math.min(box / logo.naturalWidth, box / logo.naturalHeight);
    const w = logo.naturalWidth * scale;
    const h = logo.naturalHeight * scale;
    ctx.drawImage(logo, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.fillStyle = COLORS.panel2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = Math.max(2, size * 0.02);
    ctx.stroke();
    const label = (team?.shortName ?? "?").slice(0, 3).toUpperCase();
    drawText(ctx, label, cx, cy + size * 0.02, {
      font: font(700, Math.round(size * 0.38), fonts.display),
      color: COLORS.chalk,
      align: "center",
    });
  }
  ctx.restore();
}

export function drawTrophy(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size / 100;
  ctx.save();
  ctx.translate(cx - 50 * s, cy - 50 * s);
  ctx.scale(s, s);
  ctx.fillStyle = COLORS.gold;
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  // handles
  ctx.beginPath();
  ctx.moveTo(26, 18);
  ctx.lineTo(13, 18);
  ctx.bezierCurveTo(13, 40, 20, 46, 31, 48);
  ctx.moveTo(74, 18);
  ctx.lineTo(87, 18);
  ctx.bezierCurveTo(87, 40, 80, 46, 69, 48);
  ctx.stroke();
  // cup
  ctx.beginPath();
  ctx.moveTo(24, 8);
  ctx.lineTo(76, 8);
  ctx.lineTo(76, 36);
  ctx.bezierCurveTo(76, 58, 62, 68, 50, 68);
  ctx.bezierCurveTo(38, 68, 24, 58, 24, 36);
  ctx.closePath();
  ctx.fill();
  // stem and base
  ctx.fillRect(44, 68, 12, 14);
  roundRectPath(ctx, 28, 82, 44, 10, 3);
  ctx.fill();
  ctx.restore();
}

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

/** 2026-12-20 -> "20 DECEMBER 2026" (no timezone maths, so it never shifts a day). */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't create the image."))), "image/png");
    } catch (e) {
      reject(e);
    }
  });
}
