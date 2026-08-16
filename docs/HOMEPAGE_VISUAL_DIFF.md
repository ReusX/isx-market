# Homepage visual diff — reference vs implementation

Measured **17 August 2026** with both apps running side by side at identical
viewports: reference on `localhost:4400`, implementation on `localhost:3300`.
Every number below is `getBoundingClientRect()` / `getComputedStyle()` from the
live pages, not read from source and not remembered.

---

## 0 · Why the drift happened

I built the homepage from the reference app's **markup outline**, read with
`grep` over `app/page.tsx`, and never opened its CSS or ran the app. That gave
me the right *module list* and none of the *design*: no proportions, no
hierarchy, no colour, no scale. Everything then defaulted to the generic panel
I had already built for the proof sheet.

The result is not a degraded version of the approved homepage. It is a
different design that happens to contain the same six modules.

---

## 1 · The structural error

| | reference | implementation |
|---|---|---|
| grid | **12 columns**, gap 18px | 4 columns, gap 16px |
| hero | **771 × 520**, shares its row with the flow card | full-width, own row |
| flow | **377 × 520**, beside the hero | half-width, row below |
| breadth / activity / sectors | **278 / 377 / 475 × 337** — three different widths | all equal at `span 2` |
| table | 1166 × 854 | full width |

The reference gives four of the six modules **different widths**. Mine gives
them all the same. That single decision is most of §2-F: the page reads as six
equal widgets because I made them six equal widgets.

---

## 2 · The colour error — this is §2-B

The reference is **not** a page of uniform dark cards. It is a light page
carrying two deliberately dark hero surfaces:

| surface | reference background |
|---|---|
| ISX60 hero | `radial-gradient(circle at 18% 12%, #26313f, …)` — near-black charcoal-blue |
| **foreign flow** | `linear-gradient(150deg, #173758, #102b47 72%)` — **deep navy. This is the Electric Blue identity.** |
| breadth · activity · sectors · table | `linear-gradient(145deg, rgba(255,255,255,.9), rgba(247,…))` — **light** |

My implementation paints all six with `--mv-panel-solid`. The navy flow card —
the single strongest brand moment on the page — became another grey box, and
the intentional dark/light contrast between the two hero surfaces and the four
data surfaces vanished entirely.

---

## 3 · The scale error — §2-C and §2-G

| | reference | implementation | factor |
|---|---|---|---|
| ISX60 number, desktop | **97.92px** Roboto Mono 600 | ~38px (`2.4rem`) | **2.6×** |
| ISX60 number, 375px | **63.75px** | ~30px (`1.9rem`) | 2.1× |
| H1 | 30.24px Noto Kufi **400** | ~30px **bold** | weight wrong |
| hero padding | 36px | 20px | |
| hero radius | 28px | 16px | |
| flow padding | 30px | 20px | |
| card radius | 24–28px | 16px | |
| chart plot | 697 × **250** | fluid, min 220 | |

The hero number is the page's primary object in the reference and a subordinate
one in mine. Nothing else about the hero can read correctly until that is fixed.

---

## 4 · Per-module corrections

| area | reference | current | required correction |
|---|---|---|---|
| greeting | «مساء الخير، أحمد» + «نظرة السوق ٢٤ تموز ٢٠٢٦» in **Arabic-Indic** numerals; theme pill «داكن» sits in the page body | «نظرة على السوق» + Latin-numeral freshness chip | port the reference header; decide the greeting for signed-out visitors (see §6) |
| ISX60 hero | 771×520 dark radial card · number at 98px · **range pills `1D 1W 1M 1Y 5Y الكل` top-left** · «المخطط الكامل» button · bottom metadata row `أدنى الجلسة / آخر تحديث / أعلى الجلسة` | full-width · 38px number · no range pills · no bottom metadata | rebuild to reference geometry; add range group and bottom metadata row |
| foreign flow | 377×520 **navy** card beside hero · big green net at ~48px · buy/sell bar at the **bottom** · large `iraqsm.com` watermark · «التفاصيل» pill top-left | half-width grey card · net at 1.6rem · bar mid-card · small corner watermark | restore navy gradient, height, net scale, bottom bar, watermark scale |
| breadth | **278px donut ring** with «64% إيجابي» in the centre, on a light card | full-width stacked bar on a dark card | port the ring; keep four categories — the fourth stays non-directional inside the approved component |
| activity | 377×337 light card with a **blue-filled tile** for قيمة التداول | 2×2 grey grid, vertically inflated | port the tile layout including the Electric Blue emphasis tile |
| sectors | 475×337 light card, sector rows with signed percentages | grey card with generic progress bars | match the reference sector visual exactly |
| top table | 1166×854 light card, **25 rows**, dense | dark card, logo-dominant tall rows | reduce logo to reference scale/role; restore row density |
| mobile order | hero → flow → breadth → activity → sectors → table | same ✅ | order is already correct; only geometry is wrong |

---

## 5 · What is verified correct and must NOT be touched

The data layer is not implicated in any of this and is carried forward intact:

- canonical session resolution and exact date labels
- separate foreign-flow session when it lags, and the note that says so
- four-state breadth and the shared `noPrior` truth fix
- `—` versus `0` discipline; no fake «مباشر»
- foreign-flow reconciliation (§5 gate passing)
- company links → `/c/[sym]`, flow CTA → `/statistics/foreign-flow`
- one `<main>`, one `<h1>`, 44px hit areas, no page overflow

Commits `8f53ad9` (data audit) and `b61f96a` (shared `noPrior` correction) stay.

---

## 6 · One thing that cannot be ported verbatim — flagged, not decided

The reference greeting is **«مساء الخير، أحمد»** — a personalised salutation to
a signed-in user. Production serves mostly signed-out visitors, and there is no
name to greet them with.

This is the one place where a literal port is impossible, so it needs a
decision rather than an improvisation. Options, in order of my preference:

1. keep the reference's two-line structure and typography, with a market-context
   line in place of the name for signed-out visitors, and the real greeting
   once a session exists;
2. greet by name only when signed in, and show the reference's date line alone
   otherwise;
3. drop the greeting entirely — the least faithful to the approved design.

Nothing was implemented for this yet.

---

## 7 · Reference files that are the specification

- `/Users/amed/iqwealth-design/app/page.tsx` — composition and markup
- `/Users/amed/iqwealth-design/app/globals.css` — `.home-v2-*`, `.home-index-*`,
  `.home-flow-*`, `.breadth-*`, `.home-market-*` and the `body:has(.home-v2)`
  environment block
- `/Users/amed/iqwealth-design/app/ForeignFlowGauge.tsx`,
  `SectorPerformanceChipRow.tsx`

The homepage's own `body:has(.home-v2)` block is noted in the reference CSS as
**frozen and not migrated onto the `--mv-*` layer** — so porting it means
carrying those declarations across, not translating them into tokens that do
not currently express them.
