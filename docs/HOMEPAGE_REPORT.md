# Homepage re-port — completion report

Branch `implement/iqwealth-redesign`, commit `3d977d1`, 17 August 2026.
Answers the numbered report requested in §25 of the correction brief.

Both apps were run side by side throughout: reference on `localhost:4400`,
implementation on `localhost:3300`. Every number in this document is
`getComputedStyle` / `getBoundingClientRect` off the running pages.

---

## 1 · Reference files consulted, and what was ported from each

| reference file | what came from it |
|---|---|
| `app/page.tsx` | the composition and the markup of all six modules, element for element |
| `app/globals.css` `.home-v2-*`, `.home-index-*` | frame, 12-column grid, hero geometry and type |
| … `.home-flow-*`, `.foreign-*` | the navy card, balance bar, watermark, CTA |
| … `.breadth-*` | the donut, its conic stops, its 9px inner border |
| … `.home-activity-*`, `.sector-bars` | the feature-tile grid, the sector rows |
| … `.home-market-*` | the dense board, sticky head, 33px mark |
| … `body:has(.home-v2)` | the environment (see §14 below) |
| … Electric-Blue revision · interactivity pass · ISX60 ambient override | these land LAST in the file and therefore win; the earlier declarations they replace were **not** ported |

That last row is the one that mattered most. The reference's homepage CSS is
three layers deep, and several values are declared twice — the hero's corner
highlight is `#2c2f2d` in the frozen block and `#26313f` 2,600 lines later. The
port takes the effective cascade, not the first declaration found.

## 2 · Structure replaced

`app/home.css` and `app/HomeModules.tsx` were rewritten wholesale;
`app/HomeClient.tsx` was restructured around them. Nothing of the previous
visual implementation survives: the 4-column grid, the shared `.hm-card` panel,
the stacked breadth bar, the 2×2 activity block and the generic sector bars are
all gone. A class-by-class audit shows no orphans in either direction — every
selector in `home.css` has markup and every `hm-*` class in the markup has CSS.

`lib/homeData.ts` was **not** rewritten. It gained one helper (§12 below).

## 3 · 12-column grid

```
.hm-comp { grid-template-columns: repeat(12, minmax(0,1fr)); grid-template-rows: 520px auto; gap: 18px }
hero 1/9 · flow 9/13 · breadth 1/4 · activity 4/8 · sectors 8/13
```

Measured at 1440, against the reference's own figures from
`HOMEPAGE_VISUAL_DIFF.md` §1:

| module | reference | now | before |
|---|---|---|---|
| hero | 771 × 520 | **771 × 520** | full-width, own row |
| flow | 377 × 520 | **377 × 520** | half-width, row below |
| breadth | 278 | **278** | `span 2` |
| activity | 377 | **377** | `span 2` |
| sectors | 475 | **475** | `span 2` |
| board | 1166 wide | **1166 wide** | full width |

Four different module widths, as approved. Not one is `span 2`.

## 4 · ISX60 hero

771 × 520, `border-radius: 28px`, padding 36px, on the reference's final
background — `radial-gradient(circle at 18% 12%, #26313f, transparent 30%)`
over `linear-gradient(145deg, #202321, #111312 72%)` — with the bottom-left
`rgba(49,113,198,.2)` bloom. The index number is **97.92px** at 1440 and
**63.75px** at 375, both matching the reference exactly; it was ~38px.

Ported with it: the six-position range group, the «المخطط الكامل» door beside
it, the 760×250 plot with the reference's gridlines and endpoint dot, the
crosshair with keyboard equivalent, and the three-slot metadata footer.

One caught cascade trap worth recording: the reference has
`font-size: 3.35rem` in its own ≤480 block, but restates
`clamp(3.7rem, 17vw, 5.8rem)` at ≤820 **later** in the file, so the clamp is
what actually wins at 375px. Copying the ≤480 rule literally would have shipped
a 53.6px number against the reference's 63.75px. It is measured, not copied.

## 5 · Foreign flow

`linear-gradient(150deg, #173758, #102b47 72%, #0d2540)` — the navy is back.
377 × 520 beside the hero, 30px padding, net figure at **57.6px**, balance bar
anchored to the bottom by `margin-block-start: auto`, 3rem `iraqsm.com`
watermark, footer legend, and the «التفاصيل» pill at rest (never hover-only, so
it exists on a phone) with a 44px tap target behind its 26px box.

Buy/sell are real and reconciled — 110.1M buy, 38.2M sell, net +72M, 74.3% buy
— and each side of the bar is a control that mutes the other and swaps the
sentence beneath it.

## 6 · Breadth ring

The approved donut, restored from the stacked bar. Reference conic stops and
palette: hero blue for advancing, `#d6d8d5` unchanged, `#9fa4a0` declining,
150px, 9px inner border, centre readout that swaps to a segment's own count on
focus.

**The fourth category survived.** «دون إغلاق سابق» is a fourth arc that is
`transparent` in the conic so a hatched neutral underlay shows through —
hatched and not tinted, so it cannot read as a fourth *direction*. The legend
key is hatched to match.

The centre headline excludes unknowns from **both** sides of the ratio:
11 advancing of the 42 with a known change = 26%, not 11 of 46. A percentage
whose denominator includes companies nobody has a change for would describe a
set it does not name.

## 7 · Activity

The reference's `1.2fr / 1fr` grid: one tall Electric-Blue feature tile beside
two small light ones, each with label, value, unit, signed change and a
sparkline bled to the tile's bottom edge. The neutral 2×2 with dead vertical
space is gone.

Three tiles, not four — the reference has three and the grid geometry is built
on that. The previous fourth, «شركات متداولة», is not dropped: it is the
breadth card's denominator line, where it says more. Each tile's change and
7-session trend are real, computed against prior sessions of `daily_index`.

## 8 · Sectors

The reference row: 130px name, 4px track, 62px signed figure, single column,
sorted by change descending, each row a link into the heatmap filtered on that
sector, with un-hovered rows stepping back rather than the hovered one lighting
up.

**One deliberate deviation, flagged for your call.** The reference's track
renders *invisible* in the running app. Its CSS declares
`.sector-bars > div > div { block-size: 4px; … background: #e1e3e0 }`, and its
interactivity pass changed each row from `<div>` to `<a>` without restating it,
so the selector stopped matching and the bars silently collapsed to zero
height. I restored the declaration: it is plainly the approved intent, and a
sector-*performance* module with no bars is the regression, not the design. Say
the word and I will match the running reference instead.

## 9 · Board density

1166 × 854, **25 rows at 54px**, sticky head, zebra at `rgba(49,113,198,.018)`,
`max-block-size: 668px` with local scroll. Reference columns and reference
spacing.

The logo is a **33px** mark at the head of the identity cell and nothing more —
`border-radius: 10px`, Electric Blue on a 10% tint, exactly
`.home-company-mark`. It is no longer given the company's own colour, because
that arrives as an inline background and would override the approved chip. This
is a board, not a branded company directory.

A regression I introduced and caught: an earlier draft filtered the table by
the mover tab, so «الرابحون» on a session with 11 advancers rendered an 11-row
board. The tab drives the mover **chips** only, which is the reference's own
division and is what keeps §13's «at least 25 rows» true.

## 10 · Mobile

Ported from the reference's declarations, not derived from the new desktop.
Verified at 375 × 812:

- module order **hero → activity → flow → breadth → sectors → board**, which is
  what the reference's CSS declares (note: `HOMEPAGE_VISUAL_DIFF.md` §4 records
  this as hero → flow → …; the CSS is authoritative and activity is `order: 2`)
- hero 480px min, index number 63.75px, plot 215px, middle footer slot hidden
- breadth becomes a 2-up (ring beside legend), then 1-up under 480
- board keeps its columns and scrolls locally at `min-inline-size: 760px`
- **page-level horizontal overflow: 0px**
- the flow CTA grows to a 32px box on touch, on top of its 44px target

## 11 · Light / dark

The approved **mixed** surface hierarchy is back. The previous pass painted all
six modules `--mv-panel-solid`; the reference is a light page carrying two
deliberately dark hero surfaces.

| surface | light | dark |
|---|---|---|
| ISX60 hero | charcoal | charcoal (does not invert) |
| foreign flow | **navy** `#173758 → #102b47` | charcoal + blue bloom |
| breadth · sectors · board | light glass | `rgba(44,44,44,.94)` |
| activity | `rgba(239,241,238,.76)` | `rgba(35,35,35,.86)` |
| activity feature tile | Electric Blue | Electric Blue |

Dark is a designed counterpart and not an inversion — note that the flow card
stops being navy there, which is the reference's decision, verified in its CSS
rather than assumed.

## 12 · Data verification

Checked against the live page after the re-port. Nothing regressed.

| element | value | verdict |
|---|---|---|
| canonical session | 16 أغسطس 2026, used in intro, hero footer and flow footer | ✓ one session, stated everywhere |
| ISX60 | 1,033.56 · +7.00 · +0.68% vs prior session | ✓ |
| foreign flow | buy 110.1M, sell 38.2M, net +72M, 74.3% buy | ✓ reconciles |
| flow session | equals the index session, so no lag note renders | ✓ |
| breadth | 11 / 21 / 10 / 4 = 46 traded, of 103 listed | ✓ four states, honest denominator |
| ring headline | 26% = 11 of the 42 with a known change | ✓ excludes unknowns |
| activity | 713.4M · 411.6M · 924, each with a real prior-session change | ✓ `—` where no prior exists |
| sectors | 7, ranked by change | ✓ |
| company links | `/c/BNOI` … | ✓ |
| flow CTA | `/statistics/foreign-flow` | ✓ |
| board | 25 rows | ✓ |

**Two data bugs found and fixed while porting:**

1. A sector rounding to zero printed **«−0.00%»** — the sign was taken from the
   raw value and the digits from `toFixed`, and the two disagree at the
   boundary. `signed()` in `lib/homeData.ts` now rounds first and reads the sign
   off what the reader actually sees. Applied to sectors, the board's change
   column, the activity tiles and the hero.
2. The hero and flow session dates were `<bdi>`-isolated, which reordered
   «16 أغسطس 2026» into **«أغسطس 16 2026»**. Only pure figures are isolated now.
   The same fault is why the freshness chip no longer carries a `stamp` — the
   intro line above it already states the date, correctly.

## 13 · CSS cleanup

Re-audited after the port rather than trusted, as §23 asks. The earlier cleanup
(`fd633bc`) held up: nothing it deleted turned out to be needed. Cross-checking
`home.css` against the markup finds no dead selectors and no unstyled classes.
Nothing was resurrected from the legacy stylesheet; the two rules the port
needed that resemble deleted ones (the table's cell padding and the mark's box)
are declared fresh in the scoped homepage CSS.

`styles/design-tokens.css` was touched during the work and then **reverted** —
the change is not in the commit. The reason is worth keeping: I had added
`html:has(.iq-page)` so `--mv-env` could paint the viewport, then found
`.iq-shell` already paints exactly that gradient for every migrated route. The
duplicate came out.

## 14 · Environment

The reference's `body:has(.home-v2)` block does two things, and they are
separable.

- **The canvas** was already correct and already shared: `.iq-shell` paints the
  approved gradient, byte-identical to the reference's in dark. Left alone.
- **The grain/sheen layer** was genuinely missing, and it is what makes the page
  read as a surface rather than a flat fill. Ported onto `body:has(.hm)::after`,
  masked out down the page, at the reference's opacity in both themes. Scoped to
  the page marker, so it cannot reach an un-migrated route.

**Not ported, and this is a decision you may want to overrule:** the reference
also floats the sidebar and header in glass under the same block. Doing that for
the homepage alone would make this one route's chrome disagree with every other
route in the product. That is a shell decision, not a homepage re-port, and it
belongs to whichever phase migrates the shell.

## 15 · Checks run

```
npx tsc --noEmit            clean
npx eslint (changed files)  clean
npm run check:tokens        16 tokens per theme in parity · 22 contrast pairs pass · 0 tracking rules reaching Arabic
npm run check:routes        44 routes, no rendering-mode regressions
```

Screenshots at identical viewports, six of them, per §24 —
reference/implementation × dark desktop 1440, light desktop 1440, mobile 375.
Captured over the DevTools protocol so both apps' own theme keys could be set
before paint, which is the only way to get the two into matching themes.

## 16 · Commits

- `3d977d1` — the re-port (this work)

Carried forward untouched: `8f53ad9` data audit, `b61f96a` `noPrior` fix,
`1c16513` Market Movement correctness, `68647ec` visual diff, `925e2d3` logo
constraint.

## 17 · Remaining intentional differences

Six, all deliberate, none of them drift.

1. **Range set `1W 1M 3M 1Y 5Y الكل`, not `1D …`.** `daily_index` carries one
   row per trading session; there is no intraday feed, so a 1D view would be a
   single point and drawing it would be the page's only invented number. Same
   control, same geometry, same six positions.
2. **Hero footer middle slot.** The reference reads «آخر تحديث 14:00», an
   intraday stamp this product does not have. It carries the canonical session
   date instead, in the same slot.
3. **The greeting.** Option 1 of the visual diff's §6, as flagged there: the
   reference's two-line structure, size, weight and colour are ported exactly;
   the real «مساء الخير، ‹name›» appears once a session exists, and a
   market-context line stands in for signed-out visitors.
4. **Latin numerals in the intro.** The reference's line is Arabic-Indic. This
   repo bans them in `no-restricted-syntax`, with the reason stated in the rule:
   the design and every figure beside them use Latin digits. A standing product
   standard outranks one line of the reference.
5. **The sector track is visible.** See §8 — restoring a declaration the
   reference lost to a selector regression. The one item here I would call a
   judgement rather than a constraint.
6. **Row 2 is 409px tall, not 337px.** The grid row is `auto` in the reference
   too, so this is content, not geometry: the fourth breadth category costs a
   legend row and the honest denominator costs a line. Total page height 2004px
   against the reference's 1940px — under 4%.

Market Movement has not been resumed. Awaiting approval on this page.
