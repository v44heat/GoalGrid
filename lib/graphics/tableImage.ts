import type { TableImageData } from "@/types/graphics";
import {
  COLORS, canvasToBlob, drawBackground, drawBadge, drawFooter, drawHeader, drawText, fitSize, font,
  loadFonts, loadLogos, longDate, makeCanvas, roundRectPath,
} from "./canvas";

const W = 1080;
const ROW = 88;
const TOP = 290;

// Column centres
const X = { pos: 74, badge: 152, name: 208, P: 588, W: 652, D: 716, L: 780, GD: 872, PTS: 984 };

export async function renderTableImage(d: TableImageData): Promise<HTMLCanvasElement> {
  const [fonts, logos] = await Promise.all([loadFonts(), loadLogos(d.rows.map((r) => r.team))]);
  const H = TOP + d.rows.length * ROW + 150;
  const { canvas, ctx } = makeCanvas(W, H);

  drawBackground(ctx, W, H);
  drawHeader(ctx, W, fonts, d.seasonName);
  drawText(ctx, `LEAGUE TABLE  ·  ${longDate(d.generatedOnIso)}`, W / 2, 205, {
    font: font(500, 26, fonts.body), color: COLORS.dim, align: "center", spacing: 3,
  });

  // column headings
  const head = { font: font(600, 22, fonts.body), color: COLORS.faint, align: "center" as const, spacing: 2 };
  drawText(ctx, "POS", X.pos, 262, head);
  drawText(ctx, "PLAYER", X.name, 262, { ...head, align: "left" });
  for (const k of ["P", "W", "D", "L", "GD", "PTS"] as const) drawText(ctx, k, X[k], 262, head);

  d.rows.forEach((r, i) => {
    const y = TOP + i * ROW;
    const mid = y + ROW / 2;
    const leader = d.anyPlayed && r.position === 1;

    roundRectPath(ctx, 40, y + 4, W - 80, ROW - 8, 14);
    ctx.fillStyle = leader ? "rgba(242,193,78,0.14)" : i % 2 === 0 ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.02)";
    ctx.fill();
    if (leader) {
      ctx.fillStyle = COLORS.gold;
      roundRectPath(ctx, 40, y + 4, 8, ROW - 8, 4);
      ctx.fill();
    }

    drawText(ctx, `${r.position}${r.tied && d.anyPlayed ? "=" : ""}`, X.pos, mid, {
      font: font(700, 40, fonts.display), color: leader ? COLORS.gold : COLORS.dim, align: "center",
    });

    drawBadge(ctx, r.team?.logoUrl ? logos.get(r.team.logoUrl) : null, r.team, X.badge, mid, 62, fonts);

    const teamName = r.team?.name ?? "No team";
    const size = fitSize(ctx, teamName, fonts.display, 600, 36, 22, 350);
    drawText(ctx, teamName, X.name, mid - 14, { font: font(600, size, fonts.display), color: COLORS.chalk, maxWidth: 350 });
    drawText(ctx, r.player, X.name, mid + 20, { font: font(500, 24, fonts.body), color: COLORS.dim, maxWidth: 350 });

    const num = { font: font(600, 30, fonts.body), color: COLORS.chalk, align: "center" as const };
    drawText(ctx, String(r.played), X.P, mid, num);
    drawText(ctx, String(r.won), X.W, mid, num);
    drawText(ctx, String(r.drawn), X.D, mid, num);
    drawText(ctx, String(r.lost), X.L, mid, num);
    const gd = r.goalDifference;
    drawText(ctx, gd > 0 ? `+${gd}` : String(gd), X.GD, mid, {
      ...num, color: gd > 0 ? COLORS.grass : gd < 0 ? COLORS.red : COLORS.dim,
    });
    drawText(ctx, String(r.points), X.PTS, mid, { font: font(700, 46, fonts.display), color: COLORS.chalk, align: "center" });
  });

  drawFooter(ctx, W, H, fonts, "RANKED BY POINTS, GOAL DIFFERENCE, GOALS SCORED");
  return canvas;
}

export async function tableImageBlob(d: TableImageData): Promise<Blob> {
  return canvasToBlob(await renderTableImage(d));
}
