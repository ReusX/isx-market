"use client";

import { useEffect, useRef } from "react";

/**
 * 1-bit computational artwork for the market-tool pages.
 *
 * ── Why it is generated, not drawn ────────────────────────────────────────
 * No remote asset, no stock photography, no banknote reproduction, nothing
 * copyrighted, no emblem. Each scene is a procedural GRAYSCALE FIELD reduced
 * to one bit by Floyd–Steinberg error diffusion — which is what makes the
 * texture read as a print halftone rather than a shrunk photo. The whole file
 * is a few kilobytes and there is no image request at all.
 *
 * ── Why the dither is coarse on purpose ──────────────────────────────────
 * The cell is a fixed pitch in CSS pixels, so the dot size is a deliberate
 * design decision rather than a function of the reader's screen. Diffusing at
 * device-pixel resolution would produce fine noise that reads as a JPEG
 * artefact; at this pitch it reads as a chosen material. This is also why the
 * cells are painted through a nearest-neighbour upscale instead of ~20,000
 * `fillRect` calls — crisper, and one draw instead of thousands.
 *
 * ── Theme ────────────────────────────────────────────────────────────────
 * Ink comes from the canvas's own computed `color`, so the artwork is
 * charcoal-on-cotton in light and off-white-on-charcoal in dark with no JS
 * branching. Paper is transparent — the page surface shows through, which is
 * what keeps the art from looking like a pasted-in rectangle.
 *
 * ── Restraint ────────────────────────────────────────────────────────────
 * One visual per page, never behind a number. Its job is atmosphere and
 * identity at the top of the page; every figure sits on a clean surface.
 */

export type Scene =
  | "fx" | "gold" | "oil" | "stats" | "auth"
  /* The public-information family. Four scenes, one drawing language: every
     one is an engraved elevation standing on a single ruled datum, so the four
     pages read as chapters of one publication rather than four illustrations.
     What changes between them is the SUBJECT and the crop, which is what gives
     each page its own mood. */
  | "about" | "contact" | "privacy" | "legal"
  /* System states. Same family, same datum — a 404 and a 500 that looked
     like a different product would be the moment the system stopped feeling
     designed. */
  | "missing" | "fault";

/* ═══ The fields ════════════════════════════════════════════════════════════
   Each takes aspect-corrected coordinates — x spans ±aspect/2, y spans ±0.5,
   both centred — and returns luminance: 0 is solid ink, 1 is bare paper.
   Values in between become dither texture, which is where the whole look
   comes from: gradients turn into halftone, silhouettes stay solid. */

/* Shared helpers ───────────────────────────────────────────────────────────
   `edge` fades every scene toward bare paper at its own boundary. Without it a
   dithered field ends in a hard ragged rectangle, which reads as a badly cut
   photo rather than a printed plate — the single biggest thing separating this
   from noise. */
function edge(x: number, y: number, aspect: number): number {
  const ex = Math.min(1, (aspect / 2 - Math.abs(x)) / (aspect * 0.16));
  const ey = Math.min(1, (0.5 - Math.abs(y)) / 0.09);
  return Math.max(0, Math.min(1, ex)) * Math.max(0, Math.min(1, ey));
}
/**
 * Smallest half-width, in field units, that still lands on a dither cell. Set
 * once per paint from the grid resolution.
 *
 * Every rule in these scenes is authored in normalised units, which quietly
 * assumes a resolution. On the short mobile strip the grid has half the rows,
 * so a 0.0035 half-width came out THINNER THAN ONE CELL and the borders,
 * medallion and stamp panels dissolved into speckle — the note read as a
 * hatched rectangle. Clamping here fixes it at every size instead of tuning
 * each scene twice.
 */
let MIN_W = 0.003;

/** A stroke of half-width `w` at signed distance `d`, never sub-cell. */
const stroke = (d: number, w: number) => Math.abs(d) < Math.max(w, MIN_W);

/** Fractional part that behaves for negative inputs — plain `% 1` returns a
    negative fraction below zero, which silently kills a hatch on half the
    plate. */
const frac = (v: number) => v - Math.floor(v);

/**
 * FX · a fan of engraved notes.
 *
 * The previous plate was a bare guilloché rosette. It was accurate — that IS
 * the geometry of currency engraving — but a reader has to already know that to
 * read it, and a page answering «كم الدولار اليوم» cannot ask them to. So the
 * rosette stays, but now it sits WHERE it belongs: as the medallion on a note,
 * inside a ruled border, on a fanned stack.
 *
 * Still nothing reproducible: no numerals, no portrait, no seal, no emblem, no
 * serial, and proportions that are note-LIKE rather than any actual bill. What
 * carries the meaning is the construction — a bordered rectangle of paper with
 * an engraved field and a rosette counter — not the depiction of a specific
 * currency. §1's constraint is that the reader thinks "cash", not that they
 * think of one country's note.
 */
function fxField(x: number, y: number, aspect: number): number {
  let v = 1 - 0.34 * Math.exp(-((x + 0.16) ** 2 + (y + 0.06) ** 2) * 3.2);

  // Note proportions, roughly 2.35 : 1 — the ratio most banknotes sit near
  // without being any of them.
  const W = 0.400;
  const H = 0.170;

  /** One note, rotated, drawn back-to-front. `lead` gets the full engraving. */
  const note = (cx: number, cy: number, ang: number, lead: boolean) => {
    const c = Math.cos(ang);
    const sn = Math.sin(ang);
    const px = x - cx;
    const py = y - cy;
    const rx = px * c + py * sn;
    const ry = -px * sn + py * c;
    if (Math.abs(rx) > W || Math.abs(ry) > H) return;

    // Paper first, then everything printed on it.
    v = lead ? 0.98 : 0.90;

    // Engraved field: fine diagonal line-work. Kept LIGHT — at full strength
    // it swallowed the medallion and the note read as a hatched slab.
    if (lead && stroke(frac((rx + ry) * 88) - 0.5, 0.21)) v = 0.55;

    // The double border rule that frames every note.
    const bx = W - 0.026;
    const by = H - 0.026;
    if (stroke(Math.abs(rx) - bx, 0.0035) || stroke(Math.abs(ry) - by, 0.0035)) {
      if (Math.abs(rx) <= bx + 0.004 && Math.abs(ry) <= by + 0.004) v = 0.04;
    }
    if (lead) {
      const ix = W - 0.038;
      const iy = H - 0.038;
      if (stroke(Math.abs(rx) - ix, 0.0018) || stroke(Math.abs(ry) - iy, 0.0018)) {
        if (Math.abs(rx) <= ix + 0.003 && Math.abs(ry) <= iy + 0.003) v = 0.04;
      }
    }

    if (lead) {
      // The rosette counter — the old plate, now at note scale and in its
      // proper place.
      const mx = rx + W * 0.50;
      const mr = Math.hypot(mx, ry);
      const ma = Math.atan2(ry, mx);
      if (mr < 0.108) v = 0.98;
      for (let i = 0; i < 3; i++) {
        const base = 0.038 + i * 0.026;
        if (stroke(mr - (base + 0.009 * Math.sin(ma * (6 + i * 2))), 0.0035)) v = 0.04;
      }
      if (stroke(mr - 0.106, 0.0028)) v = 0.04;

      // A blank counter panel at the other end — where a denomination would
      // sit, deliberately left empty.
      const qx = rx - W * 0.58;
      if (Math.abs(qx) < 0.080 && Math.abs(ry) < 0.080) {
        v = 0.98;
        if (stroke(Math.abs(qx) - 0.080, 0.003) || stroke(Math.abs(ry) - 0.080, 0.003)) v = 0.04;
        if (stroke(frac((qx - ry) * 54) - 0.5, 0.28)) v = 0.56;
      }
    }

    // The outer cut edge, so overlapping notes stay separate objects.
    if (stroke(Math.abs(rx) - W, 0.0035) || stroke(Math.abs(ry) - H, 0.0035)) v = 0.04;
  };

  // Back to front: the fan reads as a counted stack.
  note(-0.085, -0.205, -0.250, false);
  note(-0.030, -0.080, -0.130, false);
  note(0.040, 0.085, -0.018, true);

  return 1 - (1 - v) * edge(x, y, aspect);
}

/**
 * Gold · stacked bullion.
 *
 * The balance read as "weighing", which is a step removed from what the page
 * prices. Bars say it directly. Drawn in line and hatch with one slanted top
 * face for depth — no shine, no gradient meant to look metallic, and the page
 * stays out of yellow entirely. §2
 */
function goldField(x: number, y: number, aspect: number): number {
  // A deeper wash than the other two scenes: the ingots are drawn almost
  // entirely in white, so they need a stippled ground to read against.
  let v = 1 - 0.46 * Math.exp(-(x * x * 0.6 + (y - 0.02) ** 2) * 2.6);

  /** One ingot: a trapezoid face, narrower at the top, plus its top face. */
  const bar = (cx: number, cy: number, w: number, h: number) => {
    const top = cy - h / 2;
    const bot = cy + h / 2;
    const DV = 0.046;   // depth of the visible top face
    const DH = 0.075;   // its horizontal skew

    // Top face — a parallelogram sliding back and to the side.
    if (y >= top - DV && y <= top) {
      const k = (top - y) / DV;
      const off = k * DH;
      const hw = w * 0.84;
      // One flat tone, outlined. Splitting it light/dark put a heavy band
      // above every bar and they read as boxes wearing hats; the skew and the
      // outline are enough to carry the depth.
      if (Math.abs(x - cx - off) < hw) {
        v = 0.86;
        if (stroke(Math.abs(x - cx - off) - hw, 0.005)) v = 0.04;
      }
    }

    // The face. Trapezoid: bullion is cast in a mould, so it tapers.
    if (y >= top && y <= bot) {
      const t = (y - top) / h;
      const hw = w * (0.84 + 0.16 * t);
      if (Math.abs(x - cx) < hw) {
        v = 0.97;
        // Shaded flank — light, and thin. At full strength the hatch turned
        // every bar into a striped box and the three textures on one face
        // (flank, panel, top) fought each other.
        if (x - cx > hw * 0.30 && stroke(frac((x - cx) * 64) - 0.5, 0.22)) v = 0.72;
        // A blank stamp panel, where an assay mark would be. Outline only, no
        // text and no fill — an empty debossed rectangle.
        const sx = x - (cx - w * 0.24);
        const sy = y - (top + h * 0.38);
        if (Math.abs(sx) < 0.058 && Math.abs(sy) < 0.030) {
          v = 0.97;
          if (stroke(Math.abs(sx) - 0.058, 0.0035) || stroke(Math.abs(sy) - 0.030, 0.0035)) v = 0.04;
        }
        if (stroke(Math.abs(x - cx) - hw, 0.005)) v = 0.04;
      }
      if (stroke(y - bot, 0.005) && Math.abs(x - cx) < w) v = 0.04;
      if (stroke(y - top, 0.004) && Math.abs(x - cx) < w * 0.85) v = 0.04;
    }
  };

  // A 3 + 2 stack. The first attempt used bars a third this size and they read
  // as a row of little boxes — a trapezoid, a slanted top face and a stamp
  // panel need real area before any of them resolves at this dot pitch.
  // Centred vertically so the mobile crop still frames the whole stack.
  const W = 0.160;
  const H = 0.170;
  const ROW2 = 0.155;
  const ROW1 = ROW2 - H - 0.046;
  bar(-0.335, ROW2, W, H);
  bar(0.000, ROW2, W, H);
  bar(0.335, ROW2, W, H);
  bar(-0.168, ROW1, W, H);
  bar(0.168, ROW1, W, H);

  // The shelf they sit on.
  if (stroke(y - (ROW2 + H / 2 + 0.026), 0.005) && Math.abs(x) < 0.58) v = 0.04;

  return 1 - (1 - v) * edge(x, y, aspect);
}

/**
 * Oil · a southern export terminal, in elevation.
 *
 * The first attempt hatched the ground, the tank shadows AND both pipeline
 * runs — all of it horizontal, all of it full width — and the plate collapsed
 * into static. The rule that fixed it: ONE dominant vertical (the braced
 * tower), one horizontal (a single foreground pipe), and tone carried by
 * gradient rather than by ruling. No derrick cliché, no barrel, and the page
 * itself stays out of black-and-brown — §6 and §33.
 */
function oilField(x: number, y: number, aspect: number): number {
  const HZ = 0.20;

  // Sky is nearly bare; the density gathers just above the horizon, which is
  // where an evening field actually carries it.
  let v = 1 - 0.30 * Math.exp(-((y - HZ + 0.09) ** 2) * 20);
  // Ground as a graded wash — the dither does the work a hatch was doing.
  if (y > HZ) v = Math.min(v, 0.86 - 0.30 * ((y - HZ) / (0.5 - HZ)));
  if (stroke(y - HZ, 0.0035)) v = 0.03;

  // Two storage tanks on the horizon. The interiors are lifted to near-paper
  // FIRST, then outlined: drawn the other way round, the outlines dissolved
  // into the ground's dither and the tanks read as smudges.
  for (const [cx, rw, rh] of [[-0.28, 0.115, 0.135], [-0.50, 0.075, 0.088]] as const) {
    const px = x - cx;
    const inside = Math.abs(px) < rw && y < HZ && y > HZ - rh;
    if (inside) {
      v = 0.97;
      if (px > rw * 0.34) v = 0.58;                       // shaded flank
      if (stroke(y - (HZ - rh), 0.0035)) v = 0.03;        // roof
      if (stroke(y - (HZ - rh * 0.55), 0.0022)) v = 0.03; // one course of plate
    }
    if (stroke(Math.abs(px) - rw, 0.0035) && y < HZ && y > HZ - rh) v = 0.03;
  }

  // The braced tower — the composition's one strong vertical.
  const tx = x - 0.16;
  if (y < HZ && y > -0.40) {
    const t = (y + 0.40) / (HZ + 0.40);
    const tw = 0.020 + 0.055 * t;
    if (Math.abs(tx) < tw) v = 0.97;
    if (stroke(Math.abs(tx) - tw, 0.0038)) v = 0.03;
    if (stroke(tx - Math.sin((y + 0.40) * 26) * tw, 0.003)) v = 0.03;
    if ((stroke(y + 0.14, 0.0025) || stroke(y - 0.02, 0.0025)) && Math.abs(tx) < tw * 1.45) v = 0.03;
  }
  if (stroke(tx, 0.004) && y > -0.46 && y < -0.40) v = 0.03;

  // One pipeline run in the foreground, on trestles. Same treatment: lift, then
  // outline, so it reads as a pipe crossing the ground rather than a band of
  // texture lying in it.
  const PY = 0.315;
  if (Math.abs(y - PY) < 0.022) {
    v = 0.97;
    if (y > PY + 0.008) v = 0.60;
  }
  if (stroke(y - (PY - 0.022), 0.0035) || stroke(y - (PY + 0.022), 0.0035)) v = 0.03;
  for (const sx of [-0.44, -0.08, 0.30]) {
    if (stroke(x - sx, 0.0035) && y > PY + 0.022 && y < 0.40) v = 0.03;
  }

  return 1 - (1 - v) * edge(x, y, aspect);
}

/**
 * Statistics · a faint computational motif, and nothing more.
 *
 * §26 allows ONE subtle 1-bit accent on the statistics page for identity, and
 * forbids an illustration — the data is the product there. So this is a sparse
 * column field: the abstraction of a histogram, rendered mostly as paper and
 * heavily faded, meant to be felt at the edge of the header rather than looked
 * at. It carries no values and encodes nothing.
 */
function statsField(x: number, y: number, aspect: number): number {
  let v = 1 - 0.24 * Math.exp(-((y - 0.24) ** 2) * 5);

  // Columns of deterministic height, rising from a baseline.
  const BASE = 0.34;
  const pitch = 0.086;
  const i = Math.floor((x + 2) / pitch);
  const h = 0.10 + 0.44 * Math.abs(Math.sin(i * 2.399 + Math.cos(i * 0.77)));
  const inCol = frac((x + 2) / pitch) < 0.62;
  if (inCol && y < BASE && y > BASE - h) v = Math.min(v, 0.30 + 0.34 * (y - (BASE - h)) / h);
  if (stroke(y - BASE, 0.0035) && Math.abs(x) < 1.4) v = 0.10;

  return 1 - (1 - v) * edge(x, y, aspect);
}

/**
 * Auth · a modernist facade, read as data.
 *
 * §3 asks for computational architecture and explicitly rules out the padlock,
 * the shield and the cyber tunnel — authentication does not need security
 * clichés. So the scene is a building: a Baghdad-modernist slab on a plinth,
 * its facade a grid of bays, some filled and some open. Read one way it is a
 * tower at night; read the other it is a matrix with cells set and unset, which
 * is what the product is actually made of.
 *
 * One scene family serves the whole auth journey (§30) — the crop changes with
 * the panel's proportions, the drawing does not.
 */
function authField(x: number, y: number, aspect: number): number {
  const GROUND = 0.40;

  // Sky, holding its density just above the roofline.
  let v = 1 - 0.30 * Math.exp(-((y + 0.06) ** 2) * 3.2);

  // A slab of bays. Lifted to near-paper first, then the grid is cut into it —
  // the same order the oil scene needed, for the same reason: outlines drawn
  // into a dithered ground dissolve.
  const W = 0.30;      // half-width of the tower
  const TOP = -0.30;
  const inTower = Math.abs(x) < W && y > TOP && y < GROUND;
  if (inTower) {
    v = 0.96;
    const COLS = 9;
    const ROWS = 11;
    const cw = (W * 2) / COLS;
    const rh = (GROUND - TOP) / ROWS;
    const ci = Math.floor((x + W) / cw);
    const ri = Math.floor((y - TOP) / rh);
    const fx2 = frac((x + W) / cw);
    const fy2 = frac((y - TOP) / rh);
    // Mullions and spandrels — the structural grid.
    if (fx2 < 0.14 || fy2 < 0.16) v = 0.05;
    else {
      // A deterministic set/unset pattern. No randomness: the plate has to be
      // identical on every render, and a hash reads as a facade rather than as
      // noise.
      const h = Math.sin(ci * 12.9898 + ri * 78.233) * 43758.5453;
      const lit = h - Math.floor(h);
      // Mostly paper with a minority of filled bays. The first balance put a
      // dark value in two bays out of three and the slab read as a black block
      // rather than a drawn elevation — and a heavy plate beside a login form
      // is exactly the "giant decorative area" §31 warns about.
      if (lit > 0.80) v = 0.16;                    // a filled bay
      else if (lit > 0.56) v = 0.72;               // a half-tone bay
    }
  }
  // The slab's own edge, so it reads as built rather than as a texture patch.
  if (Math.abs(Math.abs(x) - W) < 0.005 && y > TOP && y < GROUND) v = 0.04;
  if (Math.abs(y - TOP) < 0.005 && Math.abs(x) < W) v = 0.04;

  // Plinth and ground line.
  if (y > GROUND - 0.035 && y < GROUND && Math.abs(x) < W + 0.075) v = 0.05;
  if (stroke(y - GROUND, 0.004) && Math.abs(x) < 0.92) v = 0.04;

  // A sparse network above the roofline — the exchange the building serves.
  const NODES: [number, number][] = [
    [-0.62, -0.34], [-0.40, -0.46], [0.02, -0.40], [0.44, -0.48], [0.66, -0.32],
  ];
  for (let i = 0; i < NODES.length; i++) {
    const [nx, ny] = NODES[i];
    if (Math.hypot(x - nx, y - ny) < 0.017) v = 0.05;
    const [mx, my] = NODES[(i + 1) % NODES.length];
    if (i < NODES.length - 1) {
      // Distance to the segment, so the links are thin ruled lines.
      const dx = mx - nx, dy = my - ny;
      const t = Math.max(0, Math.min(1, ((x - nx) * dx + (y - ny) * dy) / (dx * dx + dy * dy)));
      if (Math.hypot(x - (nx + t * dx), y - (ny + t * dy)) < 0.0035) v = Math.min(v, 0.30);
    }
  }

  return 1 - (1 - v) * edge(x, y, aspect);
}

/* ═══ The public-information family ═════════════════════════════════════════
   Four scenes sharing one construction, because four pages that answer four
   halves of one question should look like one publication:

     · an engraved ELEVATION, drawn flat and frontally, never in perspective
     · standing on ONE ruled datum at the same height in every scene
     · lifted to near-paper first, THEN cut — an outline drawn into a dithered
       ground dissolves, which the oil and auth plates each paid for once
     · a dense sky above, bare paper below the datum

   What differs is the subject and the crop, and that is where the mood comes
   from: a colonnade reads civic, an arch reads open, a screen reads guarded, a
   stele reads binding. None of them depicts a real building, a landmark or an
   identifiable object. */

/** The datum every plate in the family stands on. */
const DATUM = 0.30;

/**
 * Sky above, bare paper below. The shared ground of all four scenes.
 *
 * ── The rule these four scenes are built on ───────────────────────────────
 * `v` is luminance: 0 is solid ink, 1 is bare paper. INK IS THE MARK. In the
 * paper theme ink is black on light; in the terminal theme it is white on
 * near-black. So the subject must always carry MORE ink than its ground, or
 * the drawing survives one theme and dissolves in the other.
 *
 * The first pass got this backwards — the colonnade was drawn at v≈0.94, near
 * bare paper, against a city at v≈0.74. On paper that read; in dark mode the
 * columns went black against a field of white dots and the plate turned to
 * noise. Hence: ground stays sparse, subject is dense, and the ground is kept
 * light enough that it never competes.
 */
function skyBelowDatum(y: number): number {
  return y > DATUM ? 1 : 1 - 0.085 * Math.exp(-((y + 0.30) ** 2) * 4.2);
}

/**
 * About · a colonnade before a city.
 *
 * The About page is the one place the product gets to say what it is, so this
 * is the largest plate in the system and the only one with two planes: a row
 * of columns carrying an entablature in front, and a low skyline behind.
 *
 * The reading is deliberate — a civic portico standing in front of a market.
 * The old plate was the skyline alone, and a skyline alone is a stock gesture
 * that could belong to any city on any site. The colonnade is what makes it
 * about an INSTITUTION rather than about a view, and columns are the oldest
 * architecture of the place this market is in.
 *
 * It must not be confused with the auth facade, which is one slab drawn as a
 * bay grid. This is a rhythm of verticals with air between them and a horizon
 * visible through the gaps, which is the opposite composition.
 */
function aboutField(x: number, y: number, aspect: number): number {
  let v = skyBelowDatum(y);

  /* ── The city behind, small and far ─────────────────────────────────────
     Drawn first so the colonnade occludes it. Kept low and pale: it is the
     background plane, and letting it compete flattens the two planes into one
     busy texture. */
  const bpitch = 0.26;
  const bi = Math.floor((x + 8) / bpitch);
  const bh = Math.sin(bi * 12.9898) * 43758.5453;
  /* Kept LOW. At a third of the plate's height the far city filled the bays
     and the colonnade lost its air; a distant profile has to sit near the
     datum or it stops being distant. */
  const btop = DATUM - (0.05 + 0.13 * (bh - Math.floor(bh)));
  const bf = frac((x + 8) / bpitch);
  if (bf > 0.08 && bf < 0.88 && y > btop && y < DATUM) {
    v = 0.86;                                   // the far plane, barely there
    if (Math.abs(y - btop) < 0.006) v = 0.52;   // its roofline, just enough
  }

  /* ── The colonnade ──────────────────────────────────────────────────────
     Six bays across the centre of the plate. The shaft is fluted with a few
     wide grooves rather than many fine ones: at two-pixel dither cells a real
     flute count turns to speckle, and the point is the vertical rhythm, not
     an order anyone could name. */
  const TOP = -0.34;          // underside of the entablature
  const SPAN = 1.12;          // half-width the colonnade occupies
  const cpitch = SPAN * 2 / 6;
  const inSpan = Math.abs(x) < SPAN;

  if (inSpan) {
    const cf = frac((x + SPAN) / cpitch);
    const d = Math.abs(cf - 0.5);         // 0 at a column's axis
    /* Half-width of a shaft, in BAY units. The first pass used 0.17, which put
       the shaft at a third of its bay and gave a height-to-width ratio near
       1:4 — the columns read as fat striped blocks, and the gaps were too
       narrow for the city behind to show through at all. A column is a tall
       thing; if it is not tall it is a pier. */
    const HALF = 0.095;

    // Entablature — a plain band with a fillet under it, spanning the row.
    // A dentil course was tried and cut: at this dot pitch a row of small
    // teeth dithers into a dashed smear, which reads as damage rather than as
    // moulding.
    if (y > TOP - 0.085 && y < TOP) {
      v = 0.44;
      if (y > TOP - 0.020) v = 0.12;                              // the fillet
      if (Math.abs(y - (TOP - 0.085)) < 0.006) v = 0.06;          // the cornice
    }

    if (d < HALF && y > TOP && y < DATUM) {
      v = 0.46;                                  // the lit face of the shaft
      // Capital and base — plain blocks, slightly wider than the shaft.
      const cap = y < TOP + 0.040;
      const base = y > DATUM - 0.036;
      if (cap || base) v = 0.14;
      else {
        // Two flutes. The groove is the DARKER side of the pair, so the shaft
        // reads as a round thing lit from one side rather than as a stripe.
        const fl = frac((d / HALF) * 2.0);
        if (fl < 0.26) v = 0.22;
      }
      // The shaft's own edges, so it reads as drawn rather than as a patch.
      if (Math.abs(d - HALF) < 0.006) v = 0.06;
    }
    // The capitals and bases project past the shaft by a hair.
    if (d < HALF + 0.030 && (Math.abs(y - (TOP + 0.040)) < 0.008 || Math.abs(y - (DATUM - 0.036)) < 0.008)) v = 0.10;
  }

  // The datum.
  if (stroke(y - DATUM, 0.004) && Math.abs(x) < aspect * 0.46) v = 0.04;
  // A shallow plinth under the colonnade only, so the row sits on something.
  if (inSpan && y > DATUM && y < DATUM + 0.030) v = 0.12;

  return 1 - (1 - v) * edge(x, y, aspect);
}

/**
 * Contact · a threshold.
 *
 * The brief asks this page to feel like reachability, openness and dialogue,
 * and explicitly warns against cheesiness — which rules out speech bubbles,
 * envelopes, signal waves and every handshake ever drawn. A doorway is the
 * oldest and least sentimental way to say «you may come in».
 *
 * So: a tall parabolic arch, open, with the ground continuing THROUGH it and
 * out toward the viewer. The arch is Mesopotamian in profile — the pointed
 * catenary of a great vault rather than a Roman semicircle — which places it
 * without depicting anything in particular. What carries the meaning is that
 * the opening is empty and lit: nothing bars it, and the light comes from the
 * far side, so the way through is visible before you take it.
 *
 * This is the only scene in the family that is a PORTRAIT crop, because it
 * runs down a side panel rather than across a band. The tall proportion is
 * what makes the arch feel like a doorway rather than a window.
 */
function contactField(x: number, y: number, aspect: number): number {
  let v = skyBelowDatum(y);

  /* Sized for a PORTRAIT panel: at a 0.65 aspect the field only spans ±0.325
     in x, so an opening any wider than this touches both edges and the arch
     stops being a doorway in a wall and becomes a shape cut off the plate. */
  const W = 0.20;             // half-width of the opening
  const SPRING = 0.06;        // where the curve begins to close
  const APEX = -0.36;
  const WALL = 0.55;          // reach of the threshold stone below the wall

  /* The wall. A plain masonry face, coursed — the courses are what stop it
     reading as a black rectangle with a hole in it.
     FULL BLEED, and `edge()` ends it: a bounded wall is fine in the portrait
     panel where it already runs past both sides, but on the tablet and mobile
     band the same bound drew a free-standing block of masonry sitting in a
     field, which reads as rubble rather than as a wall with a door in it.
     Staggered perpends were cut for the same crop: at a compressed course
     height they interfered with the bed joints and turned the face into a
     maze. Bed joints alone are enough to say «coursed stone». */
  const inWall = y < DATUM && y > APEX - 0.10;
  if (inWall) {
    /* 0.70, not 0.52. Floyd–Steinberg turns a large area held near 0.5 into a
       regular checkerboard, and a checkerboard crossed by joint lines reads as
       a maze — the wall stopped being stone and became a pattern. Away from
       the midpoint the diffusion scatters instead of locking, which is what
       gives the face its grain. */
    v = 0.70;                                          // the masonry face
    const course = frac((y + 4) / 0.075);
    if (course < 0.11) v = 0.16;                       // the bed joints
  }

  /* The opening. Rectangular jambs up to the springing, then a pointed
     catenary closing on the apex. `t` runs 0 at the springing to 1 at the
     apex; the exponent is what gives the profile its lift — a plain circle
     here reads Roman and loses the place. */
  let openHalf = -1;
  if (y <= SPRING && y >= APEX) {
    const t = (SPRING - y) / (SPRING - APEX);
    openHalf = W * Math.pow(Math.max(0, 1 - Math.pow(t, 2.35)), 0.62);
  } else if (y > SPRING && y < DATUM) {
    openHalf = W;
  }

  if (openHalf > 0 && Math.abs(x) < openHalf) {
    /* Light through the opening: brightest at the floor and falling off with
       height, so the eye is led down and out rather than up into the vault. */
    // The void, and it must stay a void: the opening is the one place on the
    // plate with almost no ink, which is what makes it read as light rather
    // than as another surface.
    const k = (y - APEX) / (DATUM - APEX);
    v = 1 - 0.16 * (1 - k) * (1 - k);
    // A far ground line, seen through — the world continues past the door.
    if (stroke(y - 0.13, 0.004)) v = 0.42;
  }
  // The arris of the opening, drawn last so it survives.
  if (openHalf > 0 && Math.abs(Math.abs(x) - openHalf) < 0.008 && y < DATUM) v = 0.05;

  // The datum, and the threshold stone the arch stands on.
  if (stroke(y - DATUM, 0.004) && Math.abs(x) < aspect * 0.46) v = 0.04;
  if (Math.abs(x) < WALL && y > DATUM && y < DATUM + 0.026) v = 0.14;

  return 1 - (1 - v) * edge(x, y, aspect);
}

/**
 * Privacy · a screen.
 *
 * §12 of the imagery brief forbids padlocks and shields, and it is right to:
 * they are the visual language of a bank advert, and they promise security
 * rather than describe a practice. A mashrabiya says the true thing instead —
 * a pierced screen is what privacy actually is in architecture. You can see
 * out; the outside cannot see in; and the screen is a made object, not a
 * barrier.
 *
 * The geometry is a plain interlaced lattice on a diagonal grid, not a
 * reproduction of any pattern. It thins toward the centre so the plate has
 * somewhere to breathe and does not become a uniform texture — which is also
 * the readability requirement: this band sits directly above a long legal
 * document and must not be noisy.
 */
function privacyField(x: number, y: number, aspect: number): number {
  let v = skyBelowDatum(y);

  const TOP = -0.30;
  /* FULL BLEED. The first pass bounded the screen at ±1.05, which on a band
     nine times wider than it is tall left a small lattice patch marooned in
     the middle of an empty strip. A screen is a plane you look through; it has
     to reach both edges, and `edge()` is what ends it. */
  const inScreen = y > TOP && y < DATUM;

  if (inScreen) {
    v = 0.97;

    /* Density rises toward the datum and dissolves at the top, so the lattice
       emerges from the sky rather than sitting in a box. An even lattice edge
       to edge reads as wallpaper — and this band sits directly above a long
       legal document, where wallpaper is exactly the wrong texture. */
    const depth = (y - TOP) / (DATUM - TOP);
    const weight = 0.15 + 0.85 * Math.min(1, depth * 1.25);

    /* Two rotated grids at ±45°, which is what makes a lattice interlace
       rather than tile. The bars are drawn as distance-to-line so they hold a
       constant width at any crop. */
    const P = 0.085;
    const u = (x + y) / Math.SQRT2;
    const w2 = (x - y) / Math.SQRT2;
    const du = Math.abs(frac(u / P) - 0.5) * P;
    const dw = Math.abs(frac(w2 / P) - 0.5) * P;
    const bar = Math.max(0.004, 0.010 * weight);
    if (du < bar || dw < bar) v = 0.30 - 0.10 * weight;
    // The small squares where the two grids cross — the lattice's knuckles.
    if (du < bar * 1.5 && dw < bar * 1.5) v = 0.10;
  }

  if (stroke(y - DATUM, 0.004) && Math.abs(x) < aspect * 0.46) v = 0.04;
  // A sill under the whole screen.
  if (y > DATUM && y < DATUM + 0.022) v = 0.20;

  return 1 - (1 - v) * edge(x, y, aspect);
}

/**
 * Legal · a stele.
 *
 * The most sober plate in the set, for the page that has to be. An upright
 * inscribed stone is the oldest form of published law, and it is the form this
 * country gave the world — which makes it the one symbol here that is both
 * apt and local without being a flag or a landmark.
 *
 * It carries NO glyphs. The inscription is ruled registers of even ticks: the
 * shape of a text block, not writing. Drawing invented cuneiform would be
 * writing nonsense on a law page, and a reader who knows the script would see
 * that immediately.
 */
function legalField(x: number, y: number, aspect: number): number {
  let v = skyBelowDatum(y);

  /* Proportions, and why they are these numbers.
     On screen the object's width is `2·W·plateHeight` and its height is
     `span_y·plateHeight` — x is scaled by the aspect, y is not. So the drawn
     ratio is `2W / span_y` no matter how wide the band gets, and a real stele
     stands near 1:3. W = 0.125 against a 0.76 span lands exactly there. The
     first pass used 0.19, which drew a squat 1:2 marker instead of a stone. */
  const W = 0.125;            // half-width of the shaft
  const TOP = -0.36;          // where the rounded head begins
  const CROWN = -0.46;

  /* The slab: a rectangle with a rounded head. The head is a half-ellipse so
     the stone reads as dressed rather than as a rectangle with a cap. */
  let half = -1;
  if (y >= TOP && y < DATUM) half = W;
  else if (y >= CROWN && y < TOP) {
    const t = (TOP - y) / (TOP - CROWN);
    half = W * Math.sqrt(Math.max(0, 1 - t * t));
  }

  if (half > 0 && Math.abs(x) < half) {
    v = 0.50;                                    // the dressed face

    /* The inscription. Even registers of short ticks — the texture of a
       carved text block. It stops short of the head, the way a real stele
       leaves its crown for the relief. */
    if (y > TOP + 0.045 && y < DATUM - 0.035 && Math.abs(x) < W - 0.030) {
      const LINE = 0.032;
      const inLine = frac((y + 4) / LINE) < 0.42;
      const tick = frac((x + 4) / 0.019) < 0.55;
      // Cut INTO the stone, so the registers read as carved rather than as
      // ink laid on top of it.
      if (inLine && tick) v = 0.86;
    }
    // Edges last.
    if (Math.abs(Math.abs(x) - half) < 0.007) v = 0.05;
  }

  /* Steps, in three widening courses. A single stone alone in a very wide band
     reads as under-scaled; the steps give it a base, and they are what tells
     the eye that the emptiness around it is composition rather than a gap. */
  if (Math.abs(x) < W + 0.05 && y > DATUM - 0.026 && y < DATUM) v = 0.16;
  if (Math.abs(x) < W + 0.12 && y > DATUM && y < DATUM + 0.030) v = 0.26;
  if (Math.abs(x) < W + 0.24 && y > DATUM + 0.030 && y < DATUM + 0.058) v = 0.52;

  if (stroke(y - DATUM, 0.004) && Math.abs(x) < aspect * 0.46) v = 0.04;

  return 1 - (1 - v) * edge(x, y, aspect);
}

/**
 * 404 · the colonnade with a bay missing.
 *
 * §5 rules out the sad robot, the broken cartoon link and the oversized
 * gimmick, and it is right — those say «something amusing went wrong» when
 * the honest message is «this address has nothing at it».
 *
 * So the 404 is the ABOUT PLATE with one column gone: the entablature carries
 * on across the gap, the base is still there, and where the shaft should be
 * there is only sky. A reader who has seen the About page recognises the
 * building and sees the absence without being told. Nothing is broken,
 * shattered or scattered — the structure is intact, one part is simply not
 * there, which is exactly what a 404 is.
 */
function missingField(x: number, y: number, aspect: number): number {
  let v = skyBelowDatum(y);

  const TOP = -0.34;
  const SPAN = 1.12;
  const cpitch = SPAN * 2 / 6;
  const GONE = 3;             // the bay that is not there

  if (Math.abs(x) < SPAN) {
    const bay = Math.floor((x + SPAN) / cpitch);
    const cf = frac((x + SPAN) / cpitch);
    const d = Math.abs(cf - 0.5);
    const HALF = 0.095;

    // The entablature spans the gap. That is the whole point: the structure
    // holds, so the eye reads a missing PART rather than a ruin.
    if (y > TOP - 0.085 && y < TOP) {
      v = 0.44;
      if (y > TOP - 0.020) v = 0.12;
      if (Math.abs(y - (TOP - 0.085)) < 0.006) v = 0.06;
    }

    if (bay !== GONE && d < HALF && y > TOP && y < DATUM) {
      v = 0.46;
      const cap = y < TOP + 0.040;
      const base = y > DATUM - 0.036;
      if (cap || base) v = 0.14;
      else if (frac((d / HALF) * 2.0) < 0.26) v = 0.22;
      if (Math.abs(d - HALF) < 0.006) v = 0.06;
    }
    if (bay !== GONE && d < HALF + 0.030
      && (Math.abs(y - (TOP + 0.040)) < 0.008 || Math.abs(y - (DATUM - 0.036)) < 0.008)) v = 0.10;

    // The empty base, left where the column stood — an absence with a mark on
    // it reads as removal; an absence with nothing at all reads as a mistake
    // in the drawing.
    if (bay === GONE && d < HALF + 0.030 && y > DATUM - 0.030 && y < DATUM) v = 0.20;
  }

  if (stroke(y - DATUM, 0.004) && Math.abs(x) < aspect * 0.46) v = 0.04;
  if (Math.abs(x) < SPAN && y > DATUM && y < DATUM + 0.030) v = 0.12;

  return 1 - (1 - v) * edge(x, y, aspect);
}

/**
 * 500 · the tape, interrupted.
 *
 * A different failure needs a different picture, or the two states are one
 * state with different words. The 404 is architectural and still; this is the
 * signal itself — a ruled band of ticker marks running edge to edge, dense and
 * regular, with a stretch in the middle where the marks stop and only the
 * baseline continues.
 *
 * It says the thing §6 wants said: the structure is ours and it is carrying
 * nothing right now. The reader did nothing wrong, and the line has not been
 * cut.
 */
function faultField(x: number, y: number, aspect: number): number {
  let v = 1;

  const MID = 0.02;
  const GAP = 0.36;           // half-width of the interruption
  const inGap = Math.abs(x) < GAP;

  // The tape: two rules with marks between them.
  const H = 0.13;
  if (Math.abs(y - MID) < H) {
    v = 0.94;
    if (stroke(Math.abs(y - MID) - H, 0.004)) v = 0.06;

    if (!inGap) {
      // Deterministic tick heights — a ticker carries values, so an even comb
      // would read as a ruler rather than as data.
      const pitch = 0.055;
      const i = Math.floor((x + 8) / pitch);
      const h = Math.sin(i * 12.9898) * 43758.5453;
      const r = h - Math.floor(h);
      const th = 0.030 + 0.070 * r;
      if (frac((x + 8) / pitch) < 0.34 && Math.abs(y - MID) < th) v = 0.34;
    }
  }

  // The baseline runs the whole way, including through the gap.
  if (stroke(y - MID, 0.0035) && Math.abs(x) < aspect * 0.46) v = 0.10;

  // A faint dotted trace across the interruption — the signal expected, not
  // received. Kept light so it never competes with the live tape.
  if (inGap && stroke(y - MID, 0.010) && frac((x + 8) / 0.030) < 0.30) v = 0.70;

  return 1 - (1 - v) * edge(x, y, aspect);
}

const FIELDS: Record<Scene, (x: number, y: number, aspect: number) => number> = {
  fx: fxField, gold: goldField, oil: oilField, stats: statsField, auth: authField,
  about: aboutField, contact: contactField, privacy: privacyField, legal: legalField,
  missing: missingField, fault: faultField,
};

/** Dot pitch in CSS pixels. The single knob that sets how the art reads:
    coarse enough to be a chosen material, fine enough to hold a thin rule. */
const CELL = 2;

function paint(cv: HTMLCanvasElement, scene: Scene) {
  const w = cv.clientWidth;
  const h = cv.clientHeight;
  if (w < 8 || h < 8) return;

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);

  const ctx = cv.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, cv.width, cv.height);

  const gw = Math.max(2, Math.round(w / CELL));
  const gh = Math.max(2, Math.round(h / CELL));
  const aspect = w / h;
  const field = FIELDS[scene];

  // Mobile art direction is a CROP, not a shrink. §28
  //
  // The mobile hero is a short, wide strip (~3:1 against the desktop's ~1.4:1).
  // Sampling the same field into it would leave the subject marooned in the
  // middle, so the coordinates are divided instead: a wider box shows LESS of
  // the scene, larger. Desktop proportions land at 1 and are untouched.
  //
  // The divisor was 1.55 when the subjects were small line drawings. The note
  // fan and the bullion stack are much larger objects, and at that setting the
  // phone crop pushed straight through them — the front note filled the strip
  // and read as a hatched rectangle rather than a note. A crop has to keep the
  // subject recognisable; that is the whole point of cropping rather than
  // scaling.
  //
  // The public-information family opts OUT of the crop. Those four scenes are
  // composed for their own frame — subject centred, datum at a fixed height,
  // negative space to the sides as part of the drawing — and the crop would
  // push the datum straight off the bottom edge and take the entablature with
  // it. A crop helps a scene that is a single object; it destroys one that is
  // a composition.
  const composed = scene === "about" || scene === "contact"
    || scene === "privacy" || scene === "legal"
    || scene === "missing" || scene === "fault";
  const zoom = composed ? 1 : Math.max(1, Math.min(1.6, aspect / 2.2));

  // A rule must cover at least ~1.2 cells vertically or the diffusion eats it.
  MIN_W = (0.6 / zoom) / gh;

  // 1 · sample the field
  const buf = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) {
    const y = ((j + 0.5) / gh - 0.5) / zoom;
    for (let i = 0; i < gw; i++) {
      const x = (((i + 0.5) / gw - 0.5) * aspect) / zoom;
      buf[j * gw + i] = field(x, y, aspect / zoom);
    }
  }

  // 2 · Floyd–Steinberg to one bit. The serpentine scan matters: a
  //     left-to-right-only pass leaves a directional grain that is visible as
  //     diagonal streaking in the large flat gradients these scenes are made
  //     of.
  const img = ctx.createImageData(gw, gh);
  const px = img.data;
  const inkRgb = readInk(cv);
  for (let j = 0; j < gh; j++) {
    const ltr = j % 2 === 0;
    for (let k = 0; k < gw; k++) {
      const i = ltr ? k : gw - 1 - k;
      const idx = j * gw + i;
      const old = buf[idx];
      const bit = old < 0.5 ? 0 : 1;
      const err = old - bit;
      const d = ltr ? 1 : -1;
      if (ltr ? i + 1 < gw : i - 1 >= 0) buf[idx + d] += err * 0.4375;
      if (j + 1 < gh) {
        if (ltr ? i - 1 >= 0 : i + 1 < gw) buf[idx + gw - d] += err * 0.1875;
        buf[idx + gw] += err * 0.3125;
        if (ltr ? i + 1 < gw : i - 1 >= 0) buf[idx + gw + d] += err * 0.0625;
      }
      const o = idx * 4;
      // Paper is transparent, so the page surface shows through and the art
      // never reads as a pasted-in rectangle.
      px[o] = inkRgb[0]; px[o + 1] = inkRgb[1]; px[o + 2] = inkRgb[2];
      px[o + 3] = bit === 0 ? 255 : 0;
    }
  }

  // 3 · nearest-neighbour upscale, so every dot stays a crisp square
  const off = document.createElement("canvas");
  off.width = gw; off.height = gh;
  off.getContext("2d")!.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, 0, 0, cv.width, cv.height);
}

/** Ink follows the canvas's own `color`, so the theme drives it, not JS. */
function readInk(cv: HTMLCanvasElement): [number, number, number] {
  const m = getComputedStyle(cv).color.match(/\d+/g);
  if (!m) return [20, 22, 26];
  return [+m[0], +m[1], +m[2]];
}

export function DitherArt({
  scene, theme, className,
}: { scene: Scene; theme: "light" | "dark"; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  // `theme` is a dependency rather than an observer: the parent already
  // re-renders on the toggle, and the repaint has to happen after the class
  // that changes `color` has landed.
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const run = () => paint(cv, scene);
    run();
    const ro = new ResizeObserver(run);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [scene, theme]);

  return <canvas className={className ? `dt-art ${className}` : "dt-art"} ref={ref} aria-hidden="true" />;
}
