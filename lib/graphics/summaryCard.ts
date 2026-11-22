import type { SummaryCardData } from "@/types/graphics";
import {
  COLORS, canvasToBlob, drawBackground, drawBadge, drawFooter, drawHeader, drawText, drawTrophy, fitSize, font,
  loadFonts, loadLogos, makeCanvas, roundRectPath,
} from "./canvas";

const W = 1080;
const H = 1440;

export async function renderSummaryCard(d: SummaryCardData): Promise<HTMLCanvasElement> {
  const [fonts, logos] = await Promise.all([
    loadFonts(),
    loadLogos([d.champion.team, ...d.runnersUp.map((r) => r.team)]),
  ]);
  const { canvas, ctx } = makeCanvas(W, H);
  const c = d.champion;

  drawBackground(ctx, W, H);
  drawHeader(ctx, W, fonts, d.seasonName);

  drawTrophy(ctx, W / 2, 290, 150);
  drawText(ctx, "SEASON CHAMPION", W / 2, 420, {
    font: font(700, 68, fonts.display), color: COLORS.gold, align: "center", spacing: 6,
  });

  // champion badge with a gold ring
  const by = 640;
  ctx.save();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(W / 2, by, 134, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  drawBadge(ctx, c.team?.logoUrl ? logos.get(c.team.logoUrl) : null, c.team, W / 2, by, 240, fonts);

  const nameSize = fitSize(ctx, c.player.toUpperCase(), fonts.display, 700, 96, 44, W - 160, 3);
  drawText(ctx, c.player.toUpperCase(), W / 2, 866, {
    font: font(700, nameSize, fonts.display), color: COLORS.chalk, align: "center", spacing: 3, maxWidth: W - 160,
  });
  drawText(ctx, (c.team?.name ?? "No team").toUpperCase(), W / 2, 928, {
    font: font(600, 34, fonts.body), color: COLORS.dim, align: "center", spacing: 4, maxWidth: W - 160,
  });

  // stat tiles
  const tiles: [string, number][] = [
    ["MATCHES", c.played], ["WINS", c.won], ["DRAWS", c.drawn],
    ["LOSSES", c.lost], ["GOALS", c.goalsFor], ["POINTS", c.points],
  ];
  const tw = 290;
  const th = 118;
  const gap = 20;
  const x0 = (W - (tw * 3 + gap * 2)) / 2;
  tiles.forEach(([label, value], i) => {
    const x = x0 + (i % 3) * (tw + gap);
    const y = 990 + Math.floor(i / 3) * (th + gap);
    roundRectPath(ctx, x, y, tw, th, 18);
    ctx.fillStyle = label === "POINTS" ? "rgba(242,193,78,0.16)" : "rgba(255,255,255,0.06)";
    ctx.fill();
    drawText(ctx, String(value), x + tw / 2, y + 48, {
      font: font(700, 62, fonts.display), color: label === "POINTS" ? COLORS.gold : COLORS.chalk, align: "center",
    });
    drawText(ctx, label, x + tw / 2, y + 94, { font: font(600, 20, fonts.body), color: COLORS.dim, align: "center", spacing: 3 });
  });

  // runners-up line
  const ord = (n: number) => (n === 2 ? "2ND" : n === 3 ? "3RD" : `${n}TH`);
  const line = d.runnersUp
    .slice(0, 2)
    .map((r) => `${ord(r.position)}  ${r.player} (${r.points} PTS)`)
    .join("     ");
  if (line) {
    drawText(ctx, line, W / 2, 1300, {
      font: font(600, 26, fonts.body), color: COLORS.dim, align: "center", spacing: 2, maxWidth: W - 120,
    });
  }

  drawFooter(ctx, W, H, fonts);
  return canvas;
}

export async function summaryCardBlob(d: SummaryCardData): Promise<Blob> {
  return canvasToBlob(await renderSummaryCard(d));
}
