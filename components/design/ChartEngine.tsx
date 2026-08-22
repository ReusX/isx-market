"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * ChartEngine — the IQWealth charting instrument.
 *
 * ═══ AUDIT OF THE REAL CHARTING STACK ═════════════════════════════════════
 * Read from isx-market@main, read-only, before any of this was designed.
 *
 * ── The data (app/api/chart/[sym]/route.ts → Supabase `daily_prices`) ──────
 *   date · open · high · low · close · volume · value — full history, paged
 *   past the 1,000-row cap. So: REAL OHLCV, daily, going back years.
 *   There is NO intraday data anywhere in the product. The ISX publishes one
 *   bulletin per session; there are no ticks. Intraday intervals are
 *   therefore not offered here — the brief explicitly says not to invent them.
 *
 * ── components/KChart.tsx (the company-page chart today) ───────────────────
 *   klinecharts v10. Already supports: candle_solid + area, periods
 *   1W/1M/3M/1Y/5Y/All, client-side aggregation to day/week/month, crosshair
 *   with axis labels, its own OHLC legend, bar-space zoom + scrollToRealTime,
 *   a fit-to-view "reset", fullscreen via a fixed portal with Escape to exit,
 *   indicators MA/EMA/BOLL/VOL/MACD/RSI, and overlays: segment, rayLine,
 *   straightLine, horizontalStraightLine, verticalStraightLine,
 *   parallelStraightLine, fibonacciLine, simpleAnnotation.
 *   ⚠ It has NO rectangle overlay wired up (klinecharts has one — the style
 *   block already configures `overlay.rect`, nothing creates it).
 *   ⚠ Its palette is a hardcoded TradingView dark theme. It is already broken
 *   in the light theme, which is one reason it could not simply be reskinned.
 *
 * ── lib/watermark.ts ──────────────────────────────────────────────────────
 *   compositeWatermark() stamps a large diagonal `iraqsm.com` at 7% plus a
 *   solid brand pill `iraqsm.com · TICKER`, then downloadImage() /
 *   copyImage() (ClipboardItem, returns false when the browser blocks it).
 *   ⚠ That watermark exists ONLY in the exported image. Nothing is branded
 *   on screen, so a screenshot taken with the OS — which is how people
 *   actually share charts — carries no mark at all. Fixed here: the
 *   watermark is drawn into the live canvas, and the export re-renders it.
 *
 * ── app/charts/page.tsx ───────────────────────────────────────────────────
 *   A second, different chart: lightweight-charts, ISX60 only, from
 *   `daily_index` floored at the 2015-03-05 rebase. Same export helpers.
 *
 * ═══ WHAT THIS COMPONENT ADDS ═════════════════════════════════════════════
 * Everything above is real and supported. What is new is: a rectangle tool,
 * an on-screen watermark, an explicit range-vs-interval split, undo/redo and
 * a proper selected/editable drawing model, and one visual language that
 * works in both themes.
 *
 * ═══ WHY CANVAS ═══════════════════════════════════════════════════════════
 * The company page's other visuals are SVG, and SVG was right for them. Not
 * here. A five-year daily series is ~1,250 candles = ~3,750 DOM nodes that
 * re-layout on every pan frame, and export would need an SVG→raster step that
 * silently drops CSS-variable colours. One canvas draws in a few hundred
 * microseconds, pans at 60fps, and `toDataURL` returns exactly what the user
 * is looking at — which is the whole point of an export button.
 *
 * The render is a PURE function of (data, view, theme, drawings). Export
 * re-runs it at 2× into an offscreen canvas rather than upscaling a bitmap,
 * so a downloaded chart is genuinely retina rather than a blurry screenshot.
 */

/* ── Types ─────────────────────────────────────────────────────────────── */

export type Bar = { t: number; o: number; h: number; l: number; c: number; v: number };

export type ChartType = "candle" | "line";
export type RangeId = "1W" | "1M" | "3M" | "1Y" | "5Y" | "All";
export type IntervalId = "day" | "week" | "month";

export type ToolId =
  | "pointer" | "trend" | "hline" | "hray" | "vline" | "rect" | "fib" | "text";

/** A drawing lives in DATA space — bar index (fractional) and price — so it
 *  stays glued to the candles through every zoom, pan and interval change.
 *  Storing pixels was the obvious first idea and it is wrong: one scroll and
 *  every trend line is pointing at a different week. */
type Point = { i: number; p: number };
type Drawing = {
  id: string;
  tool: Exclude<ToolId, "pointer">;
  a: Point;
  b: Point;
  label?: string;
};

const RANGES: { id: RangeId; label: string }[] = [
  { id: "1W", label: "أسبوع" },
  { id: "1M", label: "شهر" },
  { id: "3M", label: "3 أشهر" },
  { id: "1Y", label: "سنة" },
  { id: "5Y", label: "5 سنوات" },
  { id: "All", label: "الكل" },
];
const RANGE_DAYS: Record<RangeId, number> = { "1W": 7, "1M": 31, "3M": 92, "1Y": 366, "5Y": 1830, All: Infinity };

/* Daily, weekly, monthly — exactly the three KChart aggregates from the one
   daily series the product has. No intraday: the ISX publishes one bulletin
   per session and there are no ticks to build it from. */
const INTERVALS: { id: IntervalId; label: string; short: string }[] = [
  { id: "day", label: "يومي", short: "ي" },
  { id: "week", label: "أسبوعي", short: "أ" },
  { id: "month", label: "شهري", short: "ش" },
];

const TOOLS: { id: ToolId; label: string; icon: React.ReactNode }[] = [
  { id: "pointer", label: "المؤشر", icon: <path d="M5 3l14 8-6 1.6L10 19z" /> },
  { id: "trend", label: "خط اتجاه", icon: <><path d="M4 19L20 5" /><circle cx="4" cy="19" r="1.9" /><circle cx="20" cy="5" r="1.9" /></> },
  { id: "hline", label: "خط أفقي", icon: <><path d="M3 12h18" /><circle cx="12" cy="12" r="1.9" /></> },
  { id: "hray", label: "شعاع أفقي", icon: <><path d="M4 12h17" /><circle cx="4" cy="12" r="1.9" /></> },
  { id: "vline", label: "خط عمودي", icon: <><path d="M12 3v18" /><circle cx="12" cy="12" r="1.9" /></> },
  { id: "rect", label: "مستطيل", icon: <rect x="4" y="6.5" width="16" height="11" rx="1.5" /> },
  { id: "fib", label: "فيبوناتشي", icon: <><path d="M4 5h16M4 10h16M4 14h16M4 19h16" /></> },
  { id: "text", label: "نص", icon: <><path d="M5 6h14M12 6v13" /></> },
];

/* ── Aggregation ───────────────────────────────────────────────────────── */

function aggregate(bars: Bar[], interval: IntervalId): Bar[] {
  if (interval === "day") return bars;
  const key = (t: number) => {
    const d = new Date(t);
    if (interval === "month") return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    // Week starts Sunday, which is when the ISX week starts.
    const s = new Date(t);
    s.setUTCDate(s.getUTCDate() - s.getUTCDay());
    return s.toISOString().slice(0, 10);
  };
  const groups = new Map<string, Bar[]>();
  for (const b of bars) {
    const k = key(b.t);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(b);
  }
  return Array.from(groups.values()).map((g) => ({
    t: g[0].t,
    o: g[0].o,
    h: Math.max(...g.map((x) => x.h)),
    l: Math.min(...g.map((x) => x.l)),
    c: g[g.length - 1].c,
    v: g.reduce((s, x) => s + x.v, 0),
  }));
}

/* ── Theme ─────────────────────────────────────────────────────────────── */

type Palette = {
  bg: string; grid: string; axis: string; ink: string; ink2: string; ink3: string;
  up: string; down: string; hero: string; panel: string; line: string;
  /** Brand lockup: wordmark ink, mark plate, and the letters on that plate. */
  wm: string; wmMark: string; wmOn: string;
  draw: string; drawFill: string;
};

const LIGHT: Palette = {
  bg: "#fbfbfa", grid: "rgba(30,34,32,.07)", axis: "rgba(30,34,32,.14)",
  ink: "#1e2220", ink2: "#565c58", ink3: "#868c88",
  up: "#12805a", down: "#b5432f", hero: "#3171c6",
  panel: "#ffffff", line: "rgba(30,34,32,.12)",
  wm: "rgba(24,27,25,.5)", wmMark: "#1e2220", wmOn: "#fbfbfa",
  draw: "#3171c6", drawFill: "rgba(49,113,198,.1)",
};
const DARK: Palette = {
  bg: "#1b1b1b", grid: "rgba(240,239,236,.06)", axis: "rgba(240,239,236,.13)",
  ink: "#f0efec", ink2: "#b4b6b2", ink3: "#8b8e8a",
  up: "#35c98a", down: "#ee6a6f", hero: "#74a9ef",
  panel: "#242424", line: "rgba(240,239,236,.12)",
  wm: "rgba(244,243,240,.62)", wmMark: "#f0efec", wmOn: "#1b1b1b",
  draw: "#74a9ef", drawFill: "rgba(116,169,239,.12)",
};

/* ── Geometry ──────────────────────────────────────────────────────────── */

const AXIS_W = 58;   // price axis, on the right — a chart is a number line
const AXIS_H = 22;   // time axis
const VOL_H = 52;    // volume pane; capped so it never eats the price
const PAD_T = 10;

type View = { start: number; count: number };

const nfP = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const nfI = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
/* Latin digits, not Arabic-Indic: every figure this chart draws beside these
   labels is Latin, and the repo's lint rule enforces the pairing. */
const AR_MONTHS = ["كانون2", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين1", "تشرين2", "كانون1"];
const fmtDay = (t: number) => { const d = new Date(t); return `${d.getUTCDate()} ${AR_MONTHS[d.getUTCMonth()]}`; };
const fmtFull = (t: number) => { const d = new Date(t); return `${d.getUTCDate()} ${AR_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
function compact(n: number) {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return String(Math.round(n));
}

/* ═══ The renderer ═════════════════════════════════════════════════════════
   Pure: same inputs, same pixels. Called for the live canvas and again, at
   2× with a title band, for export. */
type RenderOpts = {
  bars: Bar[]; view: View; type: ChartType; pal: Palette;
  showVolume: boolean; drawings: Drawing[]; selected: string | null;
  cursor: { x: number; y: number } | null;
  watermark: string;
  /** Export only: a title band with company, ticker, price and range. */
  title?: { name: string; symbol: string; price: string; change: string; up: boolean; meta: string };
};

function render(ctx: CanvasRenderingContext2D, W: number, H: number, o: RenderOpts) {
  const { bars, view, pal } = o;
  const bandH = o.title ? 54 : 0;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);

  const plotX = 0;
  const plotW = W - AXIS_W;
  const plotTop = bandH + PAD_T;
  const volTop = H - AXIS_H - (o.showVolume ? VOL_H : 0);
  const plotBottom = volTop - (o.showVolume ? 8 : 0);
  const plotH = Math.max(40, plotBottom - plotTop);

  const first = Math.max(0, Math.floor(view.start));
  const last = Math.min(bars.length - 1, Math.ceil(view.start + view.count));
  const vis = bars.slice(first, last + 1);
  if (!vis.length) return;

  const bw = plotW / view.count;                       // width per bar
  const xOf = (i: number) => plotX + (i - view.start + 0.5) * bw;

  let lo = Math.min(...vis.map((b) => b.l));
  let hi = Math.max(...vis.map((b) => b.h));
  const padP = (hi - lo) * 0.08 || hi * 0.04 || 1;
  lo -= padP; hi += padP;
  const yOf = (p: number) => plotTop + (1 - (p - lo) / (hi - lo)) * plotH;
  const pOf = (y: number) => lo + (1 - (y - plotTop) / plotH) * (hi - lo);
  const iOf = (x: number) => view.start + (x - plotX) / bw - 0.5;

  /* ── Grid ── */
  const ticks = niceTicks(lo, hi, Math.max(3, Math.floor(plotH / 46)));
  ctx.strokeStyle = pal.grid;
  ctx.lineWidth = 1;
  for (const p of ticks) {
    const y = Math.round(yOf(p)) + 0.5;
    if (y < plotTop || y > plotBottom) continue;
    ctx.beginPath(); ctx.moveTo(plotX, y); ctx.lineTo(plotX + plotW, y); ctx.stroke();
  }
  const timeTicks = pickTimeTicks(bars, view, plotW);
  for (const i of timeTicks) {
    const x = Math.round(xOf(i)) + 0.5;
    ctx.beginPath(); ctx.moveTo(x, plotTop); ctx.lineTo(x, o.showVolume ? H - AXIS_H : plotBottom); ctx.stroke();
  }

  /* ── Volume ── */
  if (o.showVolume) {
    const vMax = Math.max(...vis.map((b) => b.v), 1);
    for (let k = 0; k < vis.length; k++) {
      const b = vis[k];
      const x = xOf(first + k);
      const h = (b.v / vMax) * (VOL_H - 6);
      ctx.fillStyle = b.c >= b.o ? pal.up : pal.down;
      ctx.globalAlpha = 0.26;
      ctx.fillRect(x - Math.max(0.6, bw * 0.34), H - AXIS_H - h, Math.max(1.2, bw * 0.68), h);
    }
    ctx.globalAlpha = 1;
  }

  /* ── Price series ── */
  if (o.type === "candle") {
    // Body width shrinks with zoom; below ~2.4px a candle is a line, and
    // drawing a 0.4px border on it just turns the whole series to mud.
    const body = Math.max(1, Math.min(bw * 0.72, 26));
    const thin = body < 2.4;
    for (let k = 0; k < vis.length; k++) {
      const b = vis[k];
      const x = xOf(first + k);
      const up = b.c >= b.o;
      const col = up ? pal.up : pal.down;
      ctx.strokeStyle = col; ctx.fillStyle = col;
      ctx.lineWidth = thin ? Math.max(0.8, body) : 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, yOf(b.h));
      ctx.lineTo(Math.round(x) + 0.5, yOf(b.l));
      ctx.stroke();
      if (!thin) {
        const y1 = yOf(Math.max(b.o, b.c)), y2 = yOf(Math.min(b.o, b.c));
        ctx.fillRect(x - body / 2, y1, body, Math.max(1, y2 - y1));
      }
    }
  } else {
    ctx.beginPath();
    for (let k = 0; k < vis.length; k++) {
      const x = xOf(first + k), y = yOf(vis[k].c);
      k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    const grad = ctx.createLinearGradient(0, plotTop, 0, plotBottom);
    grad.addColorStop(0, pal.hero + "3a");
    grad.addColorStop(1, pal.hero + "00");
    ctx.save();
    ctx.lineTo(xOf(first + vis.length - 1), plotBottom);
    ctx.lineTo(xOf(first), plotBottom);
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    ctx.restore();
    ctx.beginPath();
    for (let k = 0; k < vis.length; k++) {
      const x = xOf(first + k), y = yOf(vis[k].c);
      k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = pal.hero; ctx.lineWidth = 1.8; ctx.lineJoin = "round";
    ctx.stroke();
  }

  /* ── Last price: dotted rule + tag on the axis ──
     Coloured against the PREVIOUS CLOSE, not against this bar's own open.
     Own-open is what a candle's body colour means, and it disagrees with the
     day's change often enough to matter: a session that opens at 7.74, sells
     off to 7.65 and still closes up 1.72% on yesterday draws a red candle,
     and a red price tag beside a green +1.72% in the page header is the chart
     contradicting the masthead six inches above it. */
  const lastBar = bars[bars.length - 1];
  const prevBar = bars[bars.length - 2];
  const lastY = yOf(lastBar.c);
  if (lastY > plotTop && lastY < plotBottom) {
    const up = prevBar ? lastBar.c >= prevBar.c : lastBar.c >= lastBar.o;
    ctx.save();
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = up ? pal.up : pal.down;
    ctx.globalAlpha = 0.75; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX, Math.round(lastY) + 0.5);
    ctx.lineTo(plotX + plotW, Math.round(lastY) + 0.5);
    ctx.stroke();
    ctx.restore();
    tag(ctx, plotW + 3, lastY, AXIS_W - 6, nfP.format(lastBar.c), up ? pal.up : pal.down, "#fff");
  }

  /* ── Drawings ──
     Clipped to the plot rectangle so a rectangle dragged past the edge cannot
     paint over the price axis or the volume pane. They are drawn AFTER the
     series and before the axes, which is where an interaction layer belongs:
     above every candle body and wick, below the chrome that has to stay
     readable. */
  ctx.save();
  ctx.beginPath();
  ctx.rect(plotX, plotTop - PAD_T, plotW, plotBottom - plotTop + PAD_T);
  ctx.clip();
  for (const d of o.drawings) drawShape(ctx, d, d.id === o.selected, { xOf, yOf, plotX, plotW, plotTop, plotBottom, pal });
  ctx.restore();

  /* ── Axes ── */
  ctx.strokeStyle = pal.axis; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plotX + plotW + 0.5, bandH); ctx.lineTo(plotX + plotW + 0.5, H - AXIS_H);
  ctx.moveTo(plotX, H - AXIS_H + 0.5); ctx.lineTo(W, H - AXIS_H + 0.5);
  ctx.stroke();

  ctx.fillStyle = pal.ink3;
  ctx.font = "500 10.5px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  for (const p of ticks) {
    const y = yOf(p);
    if (y < plotTop + 4 || y > plotBottom - 4) continue;
    ctx.fillText(nfP.format(p), plotX + plotW + 7, y);
  }
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "500 10.5px ui-sans-serif, system-ui, sans-serif";
  for (const i of timeTicks) {
    const x = xOf(i);
    if (x < 26 || x > plotW - 26) continue;
    ctx.fillText(fmtDay(bars[i].t), x, H - AXIS_H / 2);
  }

  /* ── Crosshair ── */
  if (o.cursor) {
    const { x, y } = o.cursor;
    const idx = Math.round(iOf(x));
    if (idx >= 0 && idx < bars.length && x < plotW && y > bandH && y < H - AXIS_H) {
      const cx = xOf(idx);
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = pal.ink3; ctx.globalAlpha = 0.72; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(cx) + 0.5, bandH); ctx.lineTo(Math.round(cx) + 0.5, H - AXIS_H);
      ctx.moveTo(plotX, Math.round(y) + 0.5); ctx.lineTo(plotX + plotW, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.restore();
      tag(ctx, plotW + 3, y, AXIS_W - 6, nfP.format(pOf(y)), pal.ink, pal.bg);
      // Time label on the time axis, centred on the bar.
      const label = fmtFull(bars[idx].t);
      ctx.font = "600 10.5px ui-sans-serif, system-ui, sans-serif";
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = pal.ink;
      roundRect(ctx, Math.max(2, Math.min(plotW - tw - 2, cx - tw / 2)), H - AXIS_H + 3, tw, AXIS_H - 6, 4);
      ctx.fill();
      ctx.fillStyle = pal.bg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, Math.max(2 + tw / 2, Math.min(plotW - tw / 2 - 2, cx)), H - AXIS_H / 2 + 0.5);
    }
  }

  /* ── Brand lockup ─────────────────────────────────────────────────────────
     Bottom-left, inside the plot, above the volume pane. Chart attribution,
     not an overlay: the previous version was a huge diagonal wordmark across
     the middle of the price action, which branded the screenshot by ruining
     the thing being screenshotted.

     Legible on purpose — around 50–60% ink rather than the 2–3% ghost a
     "watermark" usually means. The whole point is that a shared screenshot
     says where it came from at a glance.

     Drawn last, so no candle, drawing or axis can paint over it, and it is
     inside `render()` rather than in the DOM so the export carries it for
     free at whatever scale the export runs. */
  {
    const m = 22;                       // mark plate
    const x0 = plotX + 12;
    const y0 = (o.showVolume ? volTop - 8 : plotBottom) - m - 8;
    ctx.save();
    ctx.globalAlpha = o.title ? 0.92 : 0.78;

    // Mark: the shell's IQ plate, same geometry, drawn rather than imported so
    // it scales cleanly into a 2× export.
    ctx.fillStyle = pal.wmMark;
    roundRect(ctx, x0, y0, m, m, 6.5);
    ctx.fill();
    ctx.fillStyle = pal.wmOn;
    ctx.font = `800 ${Math.round(m * 0.46)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("IQ", x0 + m / 2, y0 + m / 2 + 0.5);

    ctx.textAlign = "left";
    ctx.fillStyle = pal.wm;
    ctx.font = "700 13px ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("iraqsm.com", x0 + m + 8, y0 + 11.5);
    // Ticker as a quiet second line: useful in an exported image, never
    // competing with the source.
    ctx.globalAlpha = o.title ? 0.6 : 0.5;
    ctx.font = "600 9.5px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(o.watermark, x0 + m + 8, y0 + 21.5);
    ctx.restore();
  }

  /* ── Export title band ── */
  if (o.title) {
    ctx.fillStyle = pal.panel;
    ctx.fillRect(0, 0, W, bandH);
    ctx.strokeStyle = pal.line;
    ctx.beginPath(); ctx.moveTo(0, bandH + 0.5); ctx.lineTo(W, bandH + 0.5); ctx.stroke();
    ctx.textBaseline = "middle";
    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = pal.ink;
    ctx.font = "700 16px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(o.title.name, W - 14, 21);
    ctx.fillStyle = pal.ink3;
    ctx.font = "500 11.5px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(o.title.meta, W - 14, 39);
    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.fillStyle = pal.ink;
    ctx.font = "700 20px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(o.title.price, 14, 21);
    ctx.fillStyle = o.title.up ? pal.up : pal.down;
    ctx.font = "600 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(o.title.change, 14, 39);
    /* No `iraqsm.com` here any more. The brand lockup at the bottom-left is
       drawn into every export, so putting the domain in the title band as
       well printed it twice in the same image. */
  }
}

function tag(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, text: string, bg: string, fg: string) {
  ctx.save();
  ctx.fillStyle = bg;
  roundRect(ctx, x, y - 9, w, 18, 3);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = "600 10.5px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + 0.5);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const FIB = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

type DrawCtx = {
  xOf: (i: number) => number; yOf: (p: number) => number;
  plotX: number; plotW: number; plotTop: number; plotBottom: number; pal: Palette;
};

function drawShape(ctx: CanvasRenderingContext2D, d: Drawing, sel: boolean, g: DrawCtx) {
  const { pal } = g;
  const ax = g.xOf(d.a.i), ay = g.yOf(d.a.p);
  const bx = g.xOf(d.b.i), by = g.yOf(d.b.p);
  ctx.save();
  ctx.strokeStyle = pal.draw;
  ctx.fillStyle = pal.draw;
  ctx.lineWidth = sel ? 2 : 1.4;

  if (d.tool === "trend") {
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  } else if (d.tool === "hline") {
    ctx.beginPath(); ctx.moveTo(g.plotX, ay); ctx.lineTo(g.plotX + g.plotW, ay); ctx.stroke();
    priceChip(ctx, g, ay, d.a.p);
  } else if (d.tool === "hray") {
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(g.plotX + g.plotW, ay); ctx.stroke();
    priceChip(ctx, g, ay, d.a.p);
  } else if (d.tool === "vline") {
    ctx.beginPath(); ctx.moveTo(ax, g.plotTop); ctx.lineTo(ax, g.plotBottom); ctx.stroke();
  } else if (d.tool === "rect") {
    const x = Math.min(ax, bx), y = Math.min(ay, by);
    ctx.fillStyle = pal.drawFill;
    ctx.fillRect(x, y, Math.abs(bx - ax), Math.abs(by - ay));
    ctx.strokeRect(x, y, Math.abs(bx - ax), Math.abs(by - ay));
    ctx.fillStyle = pal.draw;
  } else if (d.tool === "fib") {
    const hiP = Math.max(d.a.p, d.b.p), loP = Math.min(d.a.p, d.b.p);
    const x1 = Math.min(ax, bx), x2 = Math.max(ax, bx);
    ctx.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textBaseline = "bottom"; ctx.textAlign = "left";
    for (const lv of FIB) {
      const p = hiP - (hiP - loP) * lv;
      const y = g.yOf(p);
      ctx.globalAlpha = lv === 0 || lv === 1 ? 0.85 : 0.5;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.fillText(`${(lv * 100).toFixed(1)}%  ${nfP.format(p)}`, x1 + 5, y - 2);
    }
    ctx.globalAlpha = 1;
  } else if (d.tool === "text") {
    ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
    ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    const label = d.label || "نص";
    const w = ctx.measureText(label).width + 14;
    ctx.fillStyle = pal.draw;
    roundRect(ctx, ax - w / 2, ay - 10, w, 20, 5);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(label, ax + w / 2 - 7, ay + 0.5);
    ctx.direction = "ltr";
  }

  // Endpoint handles. Only on the selected drawing — a chart with six
  // trend lines and twelve permanent dots on it is unreadable. A drawing
  // still waiting for its second anchor counts as selected, so the first
  // anchor is visible from the moment it lands.
  if (sel) {
    const pts: [number, number][] =
      d.tool === "hline" || d.tool === "text" ? [[ax, ay]]
      : d.tool === "hray" || d.tool === "vline" ? [[ax, ay]]
      : d.tool === "rect" ? [[ax, ay], [bx, by], [ax, by], [bx, ay]]
      : [[ax, ay], [bx, by]];
    for (const [x, y] of pts) {
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = pal.panel; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = pal.draw; ctx.stroke();
    }
  }
  ctx.restore();
}

function priceChip(ctx: CanvasRenderingContext2D, g: DrawCtx, y: number, p: number) {
  tag(ctx, g.plotW + 3, y, AXIS_W - 6, nfP.format(p), g.pal.draw, "#fff");
}

function niceTicks(lo: number, hi: number, want: number): number[] {
  const raw = (hi - lo) / Math.max(1, want);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

function pickTimeTicks(bars: Bar[], view: View, plotW: number): number[] {
  const want = Math.max(2, Math.floor(plotW / 96));
  const step = Math.max(1, Math.round(view.count / want));
  const out: number[] = [];
  for (let i = Math.ceil(view.start); i < view.start + view.count && i < bars.length; i += step) {
    if (i >= 0) out.push(i);
  }
  return out;
}

/* ═══ The component ════════════════════════════════════════════════════════ */

export function ChartEngine({
  bars: allBars, symbol, name, theme, hasOhlc = true, compactMode = false,
  lineOnly = false, hasVolume = true, openFull, onFullChange, brandOnly = false,
}: {
  bars: Bar[];
  symbol: string;
  name: string;
  theme: "light" | "dark";
  /**
   * The instrument has closing values only — no open/high/low anywhere in its
   * history. Distinct from `hasOhlc={false}`, which means a company whose OHLC
   * columns happen to be null and where a disabled candle button is honest
   * ("this company has no candles"). For an index there is no such thing as a
   * candle at all, so the control is absent rather than disabled: a greyed
   * button implies a mode that could exist. The ISX60 is line-only.
   */
  lineOnly?: boolean;
  /** Indices carry no volume — `daily_index` is date + value. */
  hasVolume?: boolean;
  /** Controlled fullscreen, so a host can open straight into the workspace. */
  openFull?: boolean;
  onFullChange?: (v: boolean) => void;
  /** Hide the ticker chip in the fullscreen identity block. */
  brandOnly?: boolean;
  /** False when the series has closes only. Candles are then unavailable —
   *  the fallback is line mode, never candles synthesised from one number. */
  hasOhlc?: boolean;
  /** Company page (short) vs a standalone tall chart. */
  compactMode?: boolean;
}) {
  const [type, setType] = useState<ChartType>(hasOhlc && !lineOnly ? "candle" : "line");
  const [range, setRange] = useState<RangeId>("1Y");
  const [interval, setIntervalId] = useState<IntervalId>("day");
  const [showVolume, setShowVolume] = useState(hasVolume);
  const [fullUncontrolled, setFullUncontrolled] = useState(false);
  const full = openFull ?? fullUncontrolled;
  const setFull = useCallback((v: boolean | ((p: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(full) : v;
    if (onFullChange) onFullChange(next); else setFullUncontrolled(next);
  }, [full, onFullChange]);
  const [tool, setTool] = useState<ToolId>("pointer");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [undoStack, setUndo] = useState<Drawing[][]>([]);
  const [redoStack, setRedo] = useState<Drawing[][]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [view, setView] = useState<View>({ start: 0, count: 60 });
  const [toast, setToast] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mobile, setMobile] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const dragRef = useRef<{ mode: "pan" | "draw" | "move"; x: number; y: number; start: number; id?: string; end?: "a" | "b"; base?: Drawing } | null>(null);
  /** A two-point drawing waiting for its second anchor. */
  const pendingRef = useRef<{ id: string; downX: number; downY: number; before: Drawing[] } | null>(null);
  const pinchRef = useRef<{ dist: number; count: number } | null>(null);

  const pal = theme === "dark" ? DARK : LIGHT;

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* Range narrows the dataset; interval aggregates it. Two different
     questions — "how far back" and "how coarse" — and the real product's
     chart already conflates them (5Y silently switches to weekly bars). */
  const bars = useMemo(() => {
    const agg = aggregate(allBars, interval);
    if (range === "All") return agg;
    const end = agg.length ? agg[agg.length - 1].t : Date.now();
    return agg.filter((b) => b.t >= end - RANGE_DAYS[range] * 86_400_000);
  }, [allBars, interval, range]);

  // A new dataset resets the window to "everything, right-aligned".
  useEffect(() => {
    setView({ start: 0, count: Math.max(6, bars.length) });
    setSelected(null);
  }, [bars.length, range, interval]);

  useEffect(() => { if (!hasOhlc || lineOnly) setType("line"); }, [hasOhlc, lineOnly]);

  const commit = useCallback((next: Drawing[]) => {
    setUndo((u) => [...u.slice(-29), drawings]);
    setRedo([]);
    setDrawings(next);
  }, [drawings]);

  const undo = useCallback(() => {
    setUndo((u) => {
      if (!u.length) return u;
      setRedo((r) => [...r, drawings]);
      setDrawings(u[u.length - 1]);
      setSelected(null);
      return u.slice(0, -1);
    });
  }, [drawings]);

  const redo = useCallback(() => {
    setRedo((r) => {
      if (!r.length) return r;
      setUndo((u) => [...u, drawings]);
      setDrawings(r[r.length - 1]);
      return r.slice(0, -1);
    });
  }, [drawings]);

  /* ── Draw ── */
  const paint = useCallback(() => {
    const cv = canvasRef.current, wrap = wrapRef.current;
    if (!cv || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    if (sizeRef.current.w !== w || sizeRef.current.h !== h) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`; cv.style.height = `${h}px`;
      sizeRef.current = { w, h };
    }
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render(ctx, w, h, {
      bars, view, type, pal, showVolume, drawings, selected, cursor,
      watermark: symbol,
    });
  }, [bars, view, type, pal, showVolume, drawings, selected, cursor, symbol]);

  useEffect(() => { paint(); }, [paint]);

  /* Repaint on the frame AFTER the fullscreen box exists.
     When the workspace is closed its host is `display: none`, so the wrapper
     measures 0x0. On reopen, the paint that React schedules runs before the
     browser has laid the new box out, so the plot is drawn against a stale
     size and the price scale comes out degenerate — a blank chart with a
     hairline. One rAF is enough to let layout settle; two is belt and braces
     for the portal swap. */
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => {
      sizeRef.current = { w: 0, h: 0 };   // force the canvas to be re-sized
      paint();
    }));
    return () => cancelAnimationFrame(id);
  }, [full, paint]);
  useEffect(() => {
    const ro = new ResizeObserver(() => paint());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [paint]);

  /* ── Coordinate helpers, live ── */
  /* Reads the element, not the cached size. Entering fullscreen changes the
     box before the next paint has run, and a pointer event arriving in that
     gap mapped its y through the OLD price scale — placing a trend line at a
     price hundreds of dinars off the visible range, i.e. invisibly. */
  const geom = useCallback(() => {
    const el = wrapRef.current;
    const w = el?.clientWidth || sizeRef.current.w;
    const h = el?.clientHeight || sizeRef.current.h;
    const plotW = w - AXIS_W;
    const volTop = h - AXIS_H - (showVolume ? VOL_H : 0);
    const plotTop = PAD_T;
    const plotBottom = volTop - (showVolume ? 8 : 0);
    const bw = plotW / view.count;
    const firstV = Math.max(0, Math.floor(view.start));
    const lastV = Math.min(bars.length - 1, Math.ceil(view.start + view.count));
    const vis = bars.slice(firstV, lastV + 1);
    let lo = vis.length ? Math.min(...vis.map((b) => b.l)) : 0;
    let hi = vis.length ? Math.max(...vis.map((b) => b.h)) : 1;
    const padP = (hi - lo) * 0.08 || hi * 0.04 || 1;
    lo -= padP; hi += padP;
    return {
      plotW, plotTop, plotBottom, bw,
      iOf: (x: number) => view.start + x / bw - 0.5,
      pOf: (y: number) => lo + (1 - (y - plotTop) / (plotBottom - plotTop)) * (hi - lo),
      xOf: (i: number) => (i - view.start + 0.5) * bw,
      yOf: (p: number) => plotTop + (1 - (p - lo) / (hi - lo)) * (plotBottom - plotTop),
    };
  }, [bars, view, showVolume]);

  function localPoint(e: React.PointerEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function hitTest(x: number, y: number): { id: string; end?: "a" | "b" } | null {
    const g = geom();
    for (let k = drawings.length - 1; k >= 0; k--) {
      const d = drawings[k];
      const ax = g.xOf(d.a.i), ay = g.yOf(d.a.p);
      const bx = g.xOf(d.b.i), by = g.yOf(d.b.p);
      if (Math.hypot(x - ax, y - ay) < 9) return { id: d.id, end: "a" };
      if (d.tool !== "hline" && d.tool !== "vline" && d.tool !== "text" && Math.hypot(x - bx, y - by) < 9) return { id: d.id, end: "b" };
      if (d.tool === "hline" || d.tool === "hray") { if (Math.abs(y - ay) < 6) return { id: d.id }; }
      else if (d.tool === "vline") { if (Math.abs(x - ax) < 6) return { id: d.id }; }
      else if (d.tool === "rect") {
        const inX = x > Math.min(ax, bx) - 4 && x < Math.max(ax, bx) + 4;
        const inY = y > Math.min(ay, by) - 4 && y < Math.max(ay, by) + 4;
        if (inX && inY) return { id: d.id };
      } else if (d.tool === "text") { if (Math.hypot(x - ax, y - ay) < 26) return { id: d.id }; }
      else if (d.tool === "fib") {
        const hiP = Math.max(d.a.p, d.b.p), loP = Math.min(d.a.p, d.b.p);
        if (x > Math.min(ax, bx) - 4 && x < Math.max(ax, bx) + 4) {
          for (const lv of FIB) if (Math.abs(y - g.yOf(hiP - (hiP - loP) * lv)) < 5) return { id: d.id };
        }
      } else {
        // Trend line: distance from the segment.
        const dx = bx - ax, dy = by - ay;
        const len2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
        if (Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) < 6) return { id: d.id };
      }
    }
    return null;
  }

  function onPointerDown(e: React.PointerEvent) {
    const { x, y } = localPoint(e);
    const g = geom();
    if (x > g.plotW) return;
    /* Capture so a drag that leaves the canvas still ends on this element.
       Guarded: setPointerCapture throws NotFoundError when the pointer id is
       not active, and an exception here would abort the rest of the handler
       and silently swallow the drawing that was about to be created. */
    try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* not capturable */ }

    if (tool === "pointer") {
      const hit = hitTest(x, y);
      if (hit) {
        setSelected(hit.id);
        const base = drawings.find((d) => d.id === hit.id)!;
        dragRef.current = { mode: "move", x, y, start: view.start, id: hit.id, end: hit.end, base };
        return;
      }
      setSelected(null);
      dragRef.current = { mode: "pan", x, y, start: view.start };
      return;
    }

    /* ── Two-point tools ────────────────────────────────────────────────
       THE BUG THIS REPLACES. The old model was press-drag-release only, so a
       user who CLICKED — which is what a toolbar implies, and what everyone
       actually did — created a drawing whose two anchors were the same point.
       A zero-length trend line and a zero-area rectangle are both invisible,
       and the release then disarmed the tool. The drawing was never hidden
       behind the candles or clipped away; it was a line from a point to
       itself. Layer order, z-index and DPR were all innocent.

       Both gestures are supported now, because both are natural:
         · CLICK, move, CLICK — anchor A, live preview, anchor B
         · PRESS, drag, RELEASE — the same thing in one motion
       The difference is decided on pointerup by how far the pointer travelled.
       A tool stays armed until its second anchor lands, so a stray click can
       never produce a degenerate object. */
    if (pendingRef.current) { commitPending(x, y); return; }

    const a = { i: g.iOf(x), p: g.pOf(y) };
    const id = `d${Date.now()}${Math.round(Math.random() * 1e4)}`;
    const d: Drawing = { id, tool: tool as Drawing["tool"], a, b: { ...a }, label: tool === "text" ? "ملاحظة" : undefined };
    setDrawings((prev) => [...prev, d]);
    setSelected(id);

    // One-point tools are complete the moment they are placed.
    if (tool === "hline" || tool === "vline" || tool === "text") {
      setUndo((u) => [...u.slice(-29), drawings]);
      setRedo([]);
      setTool("pointer");
      return;
    }

    pendingRef.current = { id, downX: x, downY: y, before: drawings };
    setPendingId(id);
    dragRef.current = { mode: "draw", x, y, start: view.start, id };
  }

  /** Land the second anchor and finish the drawing. */
  function commitPending(x: number, y: number) {
    const pending = pendingRef.current;
    if (!pending) return;
    const g = geom();
    setDrawings((prev) => prev.map((d) => d.id === pending.id ? { ...d, b: { i: g.iOf(x), p: g.pOf(y) } } : d));
    setUndo((u) => [...u.slice(-29), pending.before]);
    setRedo([]);
    pendingRef.current = null;
    setPendingId(null);
    dragRef.current = null;
    setTool("pointer");
  }

  /** Abandon a half-drawn object — Escape, or switching tool mid-draw. */
  const cancelPending = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    setDrawings((prev) => prev.filter((d) => d.id !== pending.id));
    setSelected(null);
    pendingRef.current = null;
    setPendingId(null);
    dragRef.current = null;
  }, []);

  function onPointerMove(e: React.PointerEvent) {
    const { x, y } = localPoint(e);
    const g = geom();
    setCursor({ x, y });
    const idx = Math.round(g.iOf(x));
    setHoverIdx(x < g.plotW && idx >= 0 && idx < bars.length ? idx : null);

    /* Live preview. Runs whether or not a button is held, which is what makes
       the click-move-click gesture feel immediate rather than blind. */
    const pending = pendingRef.current;
    if (pending) {
      setDrawings((prev) => prev.map((d) => d.id === pending.id ? { ...d, b: { i: g.iOf(x), p: g.pOf(y) } } : d));
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;

    if (drag.mode === "pan") {
      const shift = (drag.x - x) / g.bw;
      const maxStart = Math.max(0, bars.length - view.count);
      setView((v) => ({ ...v, start: Math.max(-v.count * 0.08, Math.min(maxStart + v.count * 0.08, drag.start + shift)) }));
      return;
    }
    if (drag.mode === "draw") {
      setDrawings((prev) => prev.map((d) => d.id === drag.id ? { ...d, b: { i: g.iOf(x), p: g.pOf(y) } } : d));
      return;
    }
    if (drag.mode === "move" && drag.base) {
      const di = g.iOf(x) - g.iOf(drag.x), dp = g.pOf(y) - g.pOf(drag.y);
      setDrawings((prev) => prev.map((d) => {
        if (d.id !== drag.id) return d;
        if (drag.end === "a") return { ...d, a: { i: drag.base!.a.i + di, p: drag.base!.a.p + dp } };
        if (drag.end === "b") return { ...d, b: { i: drag.base!.b.i + di, p: drag.base!.b.p + dp } };
        return {
          ...d,
          a: { i: drag.base!.a.i + di, p: drag.base!.a.p + dp },
          b: { i: drag.base!.b.i + di, p: drag.base!.b.p + dp },
        };
      }));
    }
  }

  function onPointerUp(e?: React.PointerEvent) {
    const drag = dragRef.current;
    const pending = pendingRef.current;

    if (pending && e) {
      const { x, y } = localPoint(e);
      // Travelled far enough to read as a deliberate drag → the gesture is
      // finished. Barely moved → it was a click, so stay armed for anchor B.
      if (Math.hypot(x - pending.downX, y - pending.downY) > 5) commitPending(x, y);
      else dragRef.current = null;
      pinchRef.current = null;
      return;
    }

    if (drag?.mode === "move") { setUndo((u) => [...u.slice(-29), drawings]); setRedo([]); }
    dragRef.current = null;
    pinchRef.current = null;
  }

  /* Wheel zoom, anchored on the pointer so the bar under the cursor stays
     under the cursor. `passive: false` + preventDefault, registered natively:
     React's synthetic wheel handler is passive and cannot stop the page from
     scrolling underneath, which is the single most frustrating thing a chart
     can do. */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const g = geom();
      if (x > g.plotW) return;
      const anchor = g.iOf(x);
      const factor = e.deltaY > 0 ? 1.14 : 1 / 1.14;
      setView((v) => {
        const count = Math.max(8, Math.min(Math.max(bars.length, 8), v.count * factor));
        const ratio = (anchor - v.start) / v.count;
        return { count, start: anchor - ratio * count };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [geom, bars.length]);

  /* Pinch. Two pointers on the canvas scale the window between them. */
  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  function onTouchDown(e: React.PointerEvent) {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.current.size === 2) {
      const [p1, p2] = Array.from(activePointers.current.values());
      pinchRef.current = { dist: Math.hypot(p1.x - p2.x, p1.y - p2.y), count: view.count };
      dragRef.current = null;
    }
  }
  function onTouchMove(e: React.PointerEvent) {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pinch = pinchRef.current;
    if (pinch && activePointers.current.size === 2) {
      const [p1, p2] = Array.from(activePointers.current.values());
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
      setView((v) => {
        const count = Math.max(8, Math.min(Math.max(bars.length, 8), pinch.count * (pinch.dist / dist)));
        const mid = v.start + v.count / 2;
        return { count, start: mid - count / 2 };
      });
    }
  }
  function onTouchUp(e: React.PointerEvent) {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) pinchRef.current = null;
  }

  const resetView = () => setView({ start: 0, count: Math.max(6, bars.length) });

  /** Arming any tool abandons a half-drawn object rather than leaving an
   *  orphaned zero-size shape behind — the failure mode this pass fixes. */
  const armTool = useCallback((t: ToolId) => { cancelPending(); setTool(t); }, [cancelPending]);

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pendingRef.current) { cancelPending(); setTool("pointer"); }
        else if (full) setFull(false);
        else { setSelected(null); setTool("pointer"); }
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        commit(drawings.filter((d) => d.id !== selected));
        setSelected(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full, selected, drawings, commit, undo, redo, cancelPending, setFull]);

  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [full]);

  /* ── Export ──────────────────────────────────────────────────────────────
     Re-renders at 2× into an offscreen canvas rather than scaling the live
     bitmap, and adds a title band. The result is a retina, self-explanatory,
     branded image — not a screenshot of a widget. */
  const exportChart = useCallback(async (mode: "download" | "copy") => {
    setExportOpen(false);
    const w = sizeRef.current.w, h = sizeRef.current.h;
    if (!w) return;
    try {
      const scale = 2, band = 54;
      const cv = document.createElement("canvas");
      cv.width = w * scale; cv.height = (h + band) * scale;
      const ctx = cv.getContext("2d")!;
      ctx.scale(scale, scale);
      const last = bars[bars.length - 1], prev = bars[bars.length - 2];
      const chg = last && prev ? last.c - prev.c : 0;
      const pct = last && prev && prev.c ? (chg / prev.c) * 100 : 0;
      render(ctx, w, h + band, {
        bars, view, type, pal, showVolume, drawings, selected: null, cursor: null,
        watermark: symbol,
        title: {
          name, symbol,
          price: nfP.format(last?.c ?? 0),
          change: `${chg >= 0 ? "+" : ""}${nfP.format(chg)} (${chg >= 0 ? "+" : ""}${pct.toFixed(2)}%)`,
          up: chg >= 0,
          meta: `${symbol} · ${RANGES.find((r) => r.id === range)!.label} · ${INTERVALS.find((i) => i.id === interval)!.label} · ${type === "candle" ? "شموع" : "خطي"}`,
        },
      });
      if (mode === "download") {
        const a = document.createElement("a");
        a.href = cv.toDataURL("image/png");
        a.download = `${symbol}-iraqsm.png`;
        document.body.appendChild(a); a.click(); a.remove();
        setToast("تم تنزيل الصورة");
      } else {
        const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, "image/png"));
        if (!blob || !navigator.clipboard || typeof ClipboardItem === "undefined") {
          setToast("النسخ غير مدعوم في هذا المتصفح · استخدم التنزيل");
        } else {
          /* Raced against a timeout. `clipboard.write` can hang indefinitely
             when the browser is waiting on a permission prompt or the call
             lacks transient user activation, and a copy button that neither
             succeeds nor fails is worse than one that admits it could not. */
          const ok = await Promise.race([
            navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(() => true),
            new Promise<boolean>((res) => setTimeout(() => res(false), 2500)),
          ]);
          setToast(ok ? "تم نسخ الرسم" : "تعذّر النسخ · استخدم التنزيل");
        }
      }
    } catch {
      setToast("تعذّر تصدير الصورة");
    }
  }, [bars, view, type, pal, showVolume, drawings, symbol, name, range, interval]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  /* ── The readout rail ── */
  const readIdx = hoverIdx ?? bars.length - 1;
  const bar = bars[readIdx];
  const prevBar = readIdx > 0 ? bars[readIdx - 1] : undefined;
  const chg = bar && prevBar ? bar.c - prevBar.c : 0;
  const chgPct = bar && prevBar && prevBar.c ? (chg / prevBar.c) * 100 : 0;
  const up = chg >= 0;

  const drawingTools = TOOLS.filter((t) => t.id !== "pointer");
  const canDraw = full || !compactMode;

  const chart = (
    <div className={`ce-root ${full ? "is-full" : ""} ${theme === "dark" ? "iq-dark" : "iq-light"}`}>
      {/* ── Top bar ── */}
      <div className="ce-bar">
        {full ? (
          <div className="ce-ident">
            <strong title={name}>{name}</strong>
            {brandOnly ? null : <bdi className="ce-ticker">{symbol}</bdi>}
            <bdi className={`ce-live ${up ? "positive" : "negative"}`}>
              {nfP.format(bar?.c ?? 0)}
              <small>{up ? "+" : ""}{chgPct.toFixed(2)}%</small>
            </bdi>
          </div>
        ) : null}

        {lineOnly ? null : (
        <div className="ce-seg" role="group" aria-label="نوع الرسم">
          <button type="button" className={type === "candle" ? "active" : ""}
            aria-pressed={type === "candle"} disabled={!hasOhlc}
            title={hasOhlc ? "شموع" : "لا تتوفر بيانات افتتاح/أعلى/أدنى لهذه الشركة"}
            onClick={() => setType("candle")}>
            <svg viewBox="0 0 16 16" aria-hidden="true" className="ce-i"><path d="M5 2v12M11 2v12" strokeWidth="1.3" /><rect x="3" y="5" width="4" height="6" rx="1" /><rect x="9" y="4" width="4" height="7" rx="1" /></svg>
            <span>شموع</span>
          </button>
          <button type="button" className={type === "line" ? "active" : ""}
            aria-pressed={type === "line"} title="خطي" onClick={() => setType("line")}>
            <svg viewBox="0 0 16 16" aria-hidden="true" className="ce-i"><path d="M2 11l3.5-4 3 2.5L14 4" strokeWidth="1.5" fill="none" /></svg>
            <span>خطي</span>
          </button>
        </div>
        )}

        <div className="ce-seg ce-ranges" role="group" aria-label="المدى الزمني">
          {RANGES.map((r) => (
            <button key={r.id} type="button" className={range === r.id ? "active" : ""}
              aria-pressed={range === r.id} onClick={() => setRange(r.id)}>{r.label}</button>
          ))}
        </div>

        {/* Interval is a separate question from range, and the real data
            supports exactly these three aggregates. */}
        <label className="ce-select">
          <select value={interval} onChange={(e) => setIntervalId(e.target.value as IntervalId)}
            aria-label="فاصل الشمعة">
            {INTERVALS.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
          </select>
          <i aria-hidden="true">▾</i>
        </label>

        <div className="ce-bar-end">
          {hasVolume ? (
            <IconBtn label={showVolume ? "إخفاء حجم التداول" : "إظهار حجم التداول"} active={showVolume}
              onClick={() => setShowVolume((v) => !v)}>
              <path d="M3 14v-4M7.5 14V6M12 14V3M16.5 14v-6" strokeWidth="1.7" />
            </IconBtn>
          ) : null}
          <IconBtn label="إعادة ضبط العرض" onClick={resetView}>
            <path d="M4 9a6 6 0 1 1 1.8 4.3" strokeWidth="1.6" fill="none" /><path d="M3 5v4h4" strokeWidth="1.6" fill="none" />
          </IconBtn>

          <div className="ce-export">
            <IconBtn label="تصدير الرسم" active={exportOpen} onClick={() => setExportOpen((v) => !v)}>
              <path d="M10 3v9M10 12l-3-3M10 12l3-3M4 16h12" strokeWidth="1.6" fill="none" />
            </IconBtn>
            {exportOpen ? (
              <div className="ce-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => exportChart("download")}>
                  <span>تنزيل الصورة</span><small>PNG</small>
                </button>
                <button type="button" role="menuitem" onClick={() => exportChart("copy")}>
                  <span>نسخ الصورة</span><small>الحافظة</small>
                </button>
              </div>
            ) : null}
          </div>

          <IconBtn label={full ? "إغلاق ملء الشاشة" : "ملء الشاشة"} active={full}
            onClick={() => setFull((v) => !v)}>
            {full
              ? <path d="M8 3v5H3M12 17v-5h5" strokeWidth="1.6" fill="none" />
              : <path d="M3 8V3h5M17 12v5h-5" strokeWidth="1.6" fill="none" />}
          </IconBtn>
        </div>
      </div>

      {/* ── OHLC readout rail. A rail, not a floating tooltip: the point of
             hovering a candle is to read it WHILE watching the price action,
             and a box that follows the pointer covers the thing being read. */}
      <div className="ce-readout" aria-live="off">
        <span className="ce-read-date">{bar ? fmtFull(bar.t) : "—"}</span>
        {type === "candle" && hasOhlc ? (
          <>
            {/* O/H/L are reference levels, not directions — colouring them
                spends the semantic palette on four numbers that have no
                direction to report. Only the close is tinted. */}
            <Read k="O" v={bar ? nfP.format(bar.o) : "—"} />
            <Read k="H" v={bar ? nfP.format(bar.h) : "—"} />
            <Read k="L" v={bar ? nfP.format(bar.l) : "—"} />
          </>
        ) : null}
        <Read k="C" v={bar ? nfP.format(bar.c) : "—"} tone={up ? "up" : "down"} strong />
        <span className={`ce-read-chg ${up ? "positive" : "negative"}`}>
          <bdi>{up ? "+" : ""}{nfP.format(chg)}</bdi>
          <bdi>({up ? "+" : ""}{chgPct.toFixed(2)}%)</bdi>
        </span>
        {showVolume && hasVolume ? <Read k="الحجم" v={bar ? compact(bar.v) : "—"} /> : null}
        {hoverIdx == null ? <span className="ce-read-hint">مرّر المؤشر على الرسم للقراءة</span> : null}
      </div>

      {/* ── Plot + drawing rail ── */}
      <div className="ce-stage">
        {canDraw ? (
          <div className="ce-tools" role="toolbar" aria-label="أدوات الرسم" aria-orientation="vertical">
            <ToolBtn t={TOOLS[0]} active={tool === "pointer"} onClick={() => armTool("pointer")} />
            <hr />
            {drawingTools.map((t) => (
              <ToolBtn key={t.id} t={t} active={tool === t.id} onClick={() => armTool(t.id)} />
            ))}
            <hr />
            <IconBtn label="تراجع" disabled={!undoStack.length} onClick={undo} vertical>
              <path d="M7 5L3 9l4 4" strokeWidth="1.6" fill="none" /><path d="M3 9h8a5 5 0 0 1 0 10H7" strokeWidth="1.6" fill="none" />
            </IconBtn>
            <IconBtn label="إعادة" disabled={!redoStack.length} onClick={redo} vertical>
              <path d="M13 5l4 4-4 4" strokeWidth="1.6" fill="none" /><path d="M17 9H9a5 5 0 0 0 0 10h4" strokeWidth="1.6" fill="none" />
            </IconBtn>
            <IconBtn label="حذف المحدد" disabled={!selected} vertical
              onClick={() => { commit(drawings.filter((d) => d.id !== selected)); setSelected(null); }}>
              <path d="M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11" strokeWidth="1.5" fill="none" />
            </IconBtn>
            <IconBtn label="مسح كل الرسومات" disabled={!drawings.length} vertical
              onClick={() => { commit([]); setSelected(null); }}>
              <path d="M3 10h14M10 3v14" strokeWidth="1.6" transform="rotate(45 10 10)" />
            </IconBtn>
          </div>
        ) : null}

        <div ref={wrapRef} className="ce-plot" data-tool={tool}
          data-dragging={dragRef.current?.mode === "pan" || undefined}>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`رسم ${type === "candle" ? "شموع" : "خطي"} لسعر سهم ${name}، ${RANGES.find((r) => r.id === range)!.label}`}
            onPointerDown={(e) => { onTouchDown(e); onPointerDown(e); }}
            onPointerMove={(e) => { onTouchMove(e); onPointerMove(e); }}
            onPointerUp={(e) => { onTouchUp(e); onPointerUp(e); }}
            onPointerCancel={(e) => { onTouchUp(e); onPointerUp(e); }}
            /* Leaving the canvas clears the crosshair but must NOT touch a
               half-drawn object: sliding off the plot on the way to the second
               anchor used to destroy the drawing in progress. */
            onPointerLeave={() => { setCursor(null); setHoverIdx(null); if (!pendingRef.current) onPointerUp(); }}
          />
          {!bars.length ? (
            <div className="ce-empty">
              <strong>لا يوجد سجل سعري لهذه الفترة</strong>
              <p>لم تُسجَّل صفقات على هذا السهم ضمن المدى المختار. جرّب مدى أطول.</p>
            </div>
          ) : null}
          {!hasOhlc && type === "line" ? (
            <p className="ce-note">لا تتوفر بيانات الافتتاح والأعلى والأدنى لهذه الشركة · العرض خطي على أسعار الإغلاق.</p>
          ) : null}
        </div>
      </div>

      {/* Mobile tool sheet — the vertical rail is a desktop instrument; at
          375px it would take a fifth of the plot. */}
      {canDraw && mobile ? (
        <>
          <button type="button" className="ce-sheet-open" onClick={() => setSheetOpen(true)}>
            أدوات الرسم{drawings.length ? ` · ${drawings.length}` : ""}
          </button>
          {sheetOpen ? (
            <>
              <div className="ce-scrim" onClick={() => setSheetOpen(false)} />
              <div className="ce-sheet" role="dialog" aria-label="أدوات الرسم">
                <div className="ce-sheet-head">
                  <strong>أدوات الرسم</strong>
                  <button type="button" onClick={() => setSheetOpen(false)} aria-label="إغلاق">✕</button>
                </div>
                <div className="ce-sheet-grid">
                  {TOOLS.map((t) => (
                    <button key={t.id} type="button" className={tool === t.id ? "active" : ""}
                      onClick={() => { armTool(t.id); setSheetOpen(false); }}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
                <div className="ce-sheet-actions">
                  <button type="button" disabled={!undoStack.length} onClick={undo}>تراجع</button>
                  <button type="button" disabled={!selected}
                    onClick={() => { commit(drawings.filter((d) => d.id !== selected)); setSelected(null); }}>حذف المحدد</button>
                  <button type="button" disabled={!drawings.length}
                    onClick={() => { commit([]); setSelected(null); setSheetOpen(false); }}>مسح الكل</button>
                </div>
              </div>
            </>
          ) : null}
        </>
      ) : null}

      {toast ? <div className="ce-toast" role="status">{toast}</div> : null}
    </div>
  );

  // Fullscreen is a portal on <body>, so the page's floating sidebar, header
  // and every card sit behind it rather than around it.
  return full && typeof document !== "undefined"
    ? createPortal(<div className="ce-fullscreen">{chart}</div>, document.body)
    : chart;
}

/* ── Small parts ───────────────────────────────────────────────────────── */

function Read({ k, v, tone, strong }: { k: string; v: string; tone?: "up" | "down"; strong?: boolean }) {
  return (
    <span className={`ce-read ${strong ? "is-strong" : ""}`}>
      <em>{k}</em>
      <bdi className={tone === "up" ? "positive" : tone === "down" ? "negative" : ""}>{v}</bdi>
    </span>
  );
}

function IconBtn({ label, children, onClick, active, disabled, vertical }: {
  label: string; children: React.ReactNode; onClick: () => void;
  active?: boolean; disabled?: boolean; vertical?: boolean;
}) {
  return (
    <button type="button" className={`ce-icon ${active ? "active" : ""}`} onClick={onClick}
      disabled={disabled} aria-label={label} aria-pressed={active} data-tip={label}
      data-side={vertical ? "inline" : "block"}>
      <svg viewBox="0 0 20 20" aria-hidden="true" stroke="currentColor" fill="none"
        strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    </button>
  );
}

function ToolBtn({ t, active, onClick }: { t: typeof TOOLS[number]; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`ce-icon ${active ? "active" : ""}`} onClick={onClick}
      aria-label={t.label} aria-pressed={active} data-tip={t.label} data-side="inline">
      <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
    </button>
  );
}
