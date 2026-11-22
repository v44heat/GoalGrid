import type { MatchCardData } from "@/types/graphics";
import {
  COLORS, canvasToBlob, drawBackground, drawBadge, drawFooter, drawHeader, drawText, fitSize, font,
  loadFonts, loadLogos, longDate, makeCanvas, roundRectPath, setSpacing,
} from "./canvas";

const W = 1080;
const H = 1080;

export async function renderMatchCard(d: MatchCardData): Promise<HTMLCanvasElement> {
  const [fonts, logos] = await Promise.all([loadFonts(), loadLogos([d.home.team, d.away.team])]);
  const { canvas, ctx } = makeCanvas(W, H);

  drawBackground(ctx, W, H);
  drawHeader(ctx, W, fonts, d.seasonName);

  // matchday pill
  const label = `MATCHDAY ${d.matchday}`;
  ctx.font = font(600, 28, fonts.body);
  setSpacing(ctx, 4);
  const pillW = ctx.measureText(label).width + 80;
  setSpacing(ctx, 0);
  roundRectPath(ctx, (W - pillW) / 2, 200, pillW, 60, 30);
  ctx.fillStyle = COLORS.panel2;
  ctx.fill();
  ctx.strokeStyle = COLORS.grass;
  ctx.lineWidth = 2;
  ctx.stroke();
  drawText(ctx, label, W / 2, 231, { font: font(600, 28, fonts.body), color: COLORS.chalk, align: "center", spacing: 4 });

  const cy = 520;
  const homeX = 215;
  const awayX = W - 215;
  const badge = 250;

  // ring around the winner's badge
  const ring = (cx: number) => {
    ctx.save();
    ctx.strokeStyle = COLORS.grass;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, badge / 2 + 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };
  if (d.homeScore > d.awayScore) ring(homeX);
  if (d.awayScore > d.homeScore) ring(awayX);

  drawBadge(ctx, d.home.team?.logoUrl ? logos.get(d.home.team.logoUrl) : null, d.home.team, homeX, cy, badge, fonts);
  drawBadge(ctx, d.away.team?.logoUrl ? logos.get(d.away.team.logoUrl) : null, d.away.team, awayX, cy, badge, fonts);

  // team + player names
  const col = 330;
  for (const [side, x] of [[d.home, homeX], [d.away, awayX]] as const) {
    const team = (side.team?.name ?? "NO TEAM").toUpperCase();
    const size = fitSize(ctx, team, fonts.display, 700, 52, 28, col, 1);
    drawText(ctx, team, x, cy + 195, {
      font: font(700, size, fonts.display), color: COLORS.chalk, align: "center", spacing: 1, maxWidth: col,
    });
    drawText(ctx, side.player.toUpperCase(), x, cy + 250, {
      font: font(600, 30, fonts.body), color: COLORS.dim, align: "center", spacing: 3, maxWidth: col,
    });
  }

  // score
  const score = `${d.homeScore} - ${d.awayScore}`;
  const sSize = fitSize(ctx, score, fonts.display, 700, 190, 90, 330);
  drawText(ctx, score, W / 2, cy - 10, { font: font(700, sSize, fonts.display), color: COLORS.chalk, align: "center" });

  // full time
  drawText(ctx, "FULL TIME", W / 2, cy + 95, {
    font: font(600, 34, fonts.display), color: COLORS.grass, align: "center", spacing: 6,
  });

  drawText(ctx, longDate(d.dateIso), W / 2, 905, {
    font: font(600, 34, fonts.body), color: COLORS.chalk, align: "center", spacing: 3,
  });

  drawFooter(ctx, W, H, fonts);
  return canvas;
}

export async function matchCardBlob(d: MatchCardData): Promise<Blob> {
  return canvasToBlob(await renderMatchCard(d));
}
