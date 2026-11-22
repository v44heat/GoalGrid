import type { FixturesImageData } from "@/types/graphics";
import {
  COLORS, canvasToBlob, drawBackground, drawBadge, drawFooter, drawHeader, drawText, fitSize, font,
  loadFonts, loadLogos, longDate, makeCanvas, roundRectPath,
} from "./canvas";

const W = 1080;
const TOP = 380;
const ROW = 176;

export async function renderFixturesImage(d: FixturesImageData): Promise<HTMLCanvasElement> {
  const teams = d.fixtures.flatMap((f) => [f.home.team, f.away.team]);
  const [fonts, logos] = await Promise.all([loadFonts(), loadLogos(teams)]);
  const H = TOP + d.fixtures.length * ROW + 130;
  const { canvas, ctx } = makeCanvas(W, H);

  drawBackground(ctx, W, H);
  drawHeader(ctx, W, fonts, d.seasonName);
  drawText(ctx, `MATCHDAY ${d.matchday}`, W / 2, 245, {
    font: font(700, 118, fonts.display), color: COLORS.chalk, align: "center", spacing: 4,
  });

  const dates = Array.from(new Set(d.fixtures.map((f) => f.dateIso))).sort();
  const sameDay = dates.length === 1;
  drawText(ctx, sameDay ? longDate(dates[0]) : `${longDate(dates[0])} – ${longDate(dates[dates.length - 1])}`, W / 2, 324, {
    font: font(600, 30, fonts.body), color: COLORS.grass, align: "center", spacing: 3,
  });

  d.fixtures.forEach((f, i) => {
    const y = TOP + i * ROW;
    const mid = y + (ROW - 16) / 2;

    roundRectPath(ctx, 50, y, W - 100, ROW - 16, 22);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    ctx.stroke();

    drawBadge(ctx, f.home.team?.logoUrl ? logos.get(f.home.team.logoUrl) : null, f.home.team, 150, mid, 104, fonts);
    drawBadge(ctx, f.away.team?.logoUrl ? logos.get(f.away.team.logoUrl) : null, f.away.team, W - 150, mid, 104, fonts);

    const nameW = 250;
    const left = (s: typeof f.home) => {
      const size = fitSize(ctx, s.player, fonts.display, 700, 46, 26, nameW);
      drawText(ctx, s.player, 224, mid - 16, { font: font(700, size, fonts.display), color: COLORS.chalk, maxWidth: nameW });
      drawText(ctx, s.team?.name ?? "No team", 224, mid + 24, { font: font(500, 24, fonts.body), color: COLORS.dim, maxWidth: nameW });
    };
    const right = (s: typeof f.home) => {
      const size = fitSize(ctx, s.player, fonts.display, 700, 46, 26, nameW);
      drawText(ctx, s.player, W - 224, mid - 16, { font: font(700, size, fonts.display), color: COLORS.chalk, align: "right", maxWidth: nameW });
      drawText(ctx, s.team?.name ?? "No team", W - 224, mid + 24, { font: font(500, 24, fonts.body), color: COLORS.dim, align: "right", maxWidth: nameW });
    };
    left(f.home);
    right(f.away);

    drawText(ctx, f.score ?? "VS", W / 2, mid - 8, {
      font: font(700, f.score ? 50 : 44, fonts.display), color: f.score ? COLORS.chalk : COLORS.faint, align: "center",
    });
    const sub = f.note ?? (sameDay ? null : longDate(f.dateIso).replace(/ \d{4}$/, ""));
    if (sub) {
      drawText(ctx, sub, W / 2, mid + 34, { font: font(600, 20, fonts.body), color: f.note ? COLORS.gold : COLORS.dim, align: "center", spacing: 1 });
    }
  });

  drawFooter(ctx, W, H, fonts);
  return canvas;
}

export async function fixturesImageBlob(d: FixturesImageData): Promise<Blob> {
  return canvasToBlob(await renderFixturesImage(d));
}
