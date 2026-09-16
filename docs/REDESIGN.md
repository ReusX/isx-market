# IQWealth redesign · tracker

Identity approved 16 September 2026, from the reference at latitude.xyz.
The approved mockup is [`docs/design/direction.html`](design/direction.html);
open it in a browser — it is the answer to "what should this look like".

## The identity in one screen

| | Value | Rule |
|---|---|---|
| Page | light `#F5F2EC` (paper) · dark `#0F1218` (graphite, blue hint) | The ground. Flat, no gradient. Dark is a NEUTRAL near-black, never a coloured ground. |
| Ink | light `#1A2035` · dark `#E7E7E2` | Softened navy by day, warm off-white by night — never pure white on dark. Secondary ≈ 65 %, muted ≈ 45 %. |
| Accent | `--blue #146BFD` | Only in chart details, links, icons, focus rings and selected-state edges. Never on the main canvas or large cards; the homepage hero is the one deliberate exception. |
| Fills | primary vs selected | Warm-white / navy fill = the one **primary CTA** on a page only (e.g. «استكشف السوق»); sign-in and the logo are outlined pills. A selected range, filter, door or rail item = quiet dark-blue-grey `--sel-bg` with light text and a thin blue edge. Active rail item = quiet surface + 3px blue edge at the start. No pure white, no pure black, no glow, no heavy shadow. |
| Watermark | `IRAQSM.COM` | Bold, low-opacity, in the empty space of every chart or data panel a reader might screenshot. |
| Rising | light chip `#DCECD8`/`#1F6B45` · dark `#8FD3A8` at 14 % | Chip when there is a ground; text when not. |
| Falling | light chip `#F4DCD0`/`#A4402F` · dark `#F0A08E` at 14 % | Same. |
| Border | navy 14 % | Hairlines. **No shadows anywhere.** |
| Type | Readex Pro, one face | 200–300 display · 400 body · 500 controls. Nothing bold. No positive tracking on Arabic. Figures tabular. |
| Shape | 54 px pills · 32 px blocks · 16 px panels · 8 px chips | |
| Density | one row = one fact | Detail goes behind a click. Prefer a table to cards. |
| Shell | page shell ≤ 1920px = 260px section rail + 32px gap + flexible main (`min-width: 0`) | Top nav = product navigation (the four doors). The rail = navigation within the active section only; never repeated in the content. < 1280px: rail becomes one scrollable row above the content; < 720px: out of flow, opened via «القسم». Tables use defined column tracks, never space-between. |
| Width | **full width for information surfaces; constrained width for reading** | `.id-full` for tables/boards/dashboards (edge to edge, nav gutters) · `.id-wrap` 1180px for hubs and mixed pages · `.id-read` 72ch for articles, guides, legal, prose. |
| Theme | light + dark | Light = «ورق ناعم» (L2), dark = «غرافيت بلمحة زرقاء». Same blue hero, same pills, no shadows. Style through ROLE tokens (`--page`, `--ink`, `--border`, `--primary-bg`, `--moss`…), never primitives. `data-theme` is always stamped (stored choice, else OS). |

Tokens: `app/globals.css` (base) · `styles/design-tokens.css` (`--mv-*`, same palette).
Vocabulary: `styles/identity.css` (`.id-*` classes — build from these).
Gates: `npm run check:tokens` (parity · contrast · Arabic tracking) must pass on every commit.

## What "done" means for a page

1. Built from `.id-*` vocabulary + a small route stylesheet; nothing bold, nothing shadowed, no blue text.
2. Its old stylesheet is deleted or emptied; no `[data-theme='dark']` rules with their own literal colours remain in it — dark comes from the role tokens.
3. Arabic copy reads naturally (short sentences, no jargon), English page matches.
4. Phone width (400 px) checked; body never scrolls sideways.
5. `check:tokens`, `check:i18n`, `check:routes` green; the page-specific gate (`check:banking`, `check:charts`) where one exists.

## Foundation — DONE

- [x] Palette → `app/globals.css`, `styles/design-tokens.css` (parity + contrast gates green)
- [x] Readex Pro replaces Plex Arabic / Noto Kufi / Roboto Mono (`components/shell/Document.tsx`)
- [x] Dark theme as role-token overrides; shared `shell/ThemeToggle` in header and homepage nav; Thmanyah `@font-face` removed
- [x] `styles/identity.css` vocabulary
- [x] Mockup kept at `docs/design/direction.html`

## How a page is rebuilt (the recipe)

1. Write a NEW component under `components/site/` — never edit or import the old route component. Data libs (`lib/*`) are fine to reuse; nothing under `components/routes|shell|design|company` is.
2. Wrap it in `<SiteShell>`; inside a door, lay the page out as `<main className="id-full iq-door">` with `<DoorRail door=… items=…/>` first (sidebar on desktop, pill row on phones); assemble from `.id-*` (identity.css) plus a small `styles/<page>.css` with a fresh prefix (check it is unused: `grep -ho "\.PREFIX-[a-z]*" styles/*.css`). Class names already taken by old stylesheets include `sn-`, `sf-`, `mk-`, `gh-`, `hm-`, `mt-`, `cd-`, `st-`.
3. Strings go in the dictionaries (`lib/i18n/messages/{ar,en}`); the i18n gate rejects Arabic literals in components.
4. Point the route (`app/(ar)/…/page.tsx` and `app/(en)/en/…/page.tsx`) at the new component; add the route to `AppFrame.REBUILT` so the old frame steps aside.
5. Gates: `check:tokens`, `check:i18n` (dev server on 3300), `check:routes`; phone width; both themes. Tick the row here.

## Pages — one by one

Order is by traffic and by what other pages borrow from. Shell first because every page wears it.

| # | Route(s) | Component(s) | Stylesheet(s) to replace | Status |
|---|---|---|---|---|
| 1 | shell (nav, mobile menu, foot) | NEW `site/SiteNav` `SiteFoot` `SiteShell` (`styles/site.css`) — rebuilt pages wear this; old `shell/*` + `shell.css` are deleted when `AppFrame.REBUILT` covers every route | — | ☑ 2026-09-16 (search not yet rebuilt) |
| 2 | `/` | THE MARKET OVERVIEW (`site/MarketPage` variant `root`, server-rendered via `lib/marketServer.ts`, ISR 60s): welcome card for first visits, chart, flow, session, top 30 with a link to `/market` for the rest. **No redirect** — `/market` is the site's #1 result for «اسعار الاسهم العراقية» and keeps its own title. | `landing.css` · old `HomePage`/`home.css` kept only until /market reuses its modules | ☑ 2026-09-16 |
| 3 | `/market` (the full board, own title kept; server-rendered; `?date=` any session; listing filter incl. suspended; about + FAQ text) | NEW `site/MarketPage` (`styles/markets.css`): openers (`IndexChart` to-scale SVG, ISX60 · RSISX switch (RSISX via `/api/index/rsisx` proxy), ranges/hi-lo/crosshair · `FlowRing` foreign buy/sell ring with net in the centre, session or last-20), session block (breadth from traded companies · value · volume · trades), door rail, board (search + sector pills + one-row-one-fact table) | old `MarketBoard`/`market.css` unused, delete in sweep | ☑ 2026-09-16 foundation |
| 4 | `/c/[sym]` | `routes/CompanyDetail` `company/CompanyProfile` `company/CompanyChart` | `company.css` `chart-engine.css` `panels.css` | ☐ |
| 5 | `/c/[sym]/financials` | `routes/CompanyFinancials` | `financials.css` | ☐ |
| 6 | `/companies` | NEW `site/DirectoryPage` (`styles/directory.css`): the directory — who is listed, no prices; cards with logo, names, capital, ISC market tier (`public/data/isc-tiers.json`), facts from profiles, trading status; sector/capital/A–Z order; search; status filter; ItemList markup; server-rendered ISR 1h | old `CompaniesPage` unused, delete in sweep | ☑ 2026-09-16 |
| 7 | `/screener` | `routes/Screener` | `screener.css` (50 dark rules) | ☐ |
| 8 | `/heatmap` | `routes/Heatmap` | `heatmap.css` | ☐ |
| 9 | `/statistics` + `/foreign-flow` `/ownership` `/shareholders` | `routes/Statistics` `ForeignFlow` `OwnershipPage` `ShareholdersPage` `depositoryUi` | `statistics.css` `foreign-flow.css` `depository.css` `data-table.css` | ☐ |
| 10 | `/banks`, `/banks/[slug]` | `routes/BanksHub` `BankProfile` | `banks.css` | ☐ |
| 11 | `/gold` `/fx` `/oil` | `routes/GoldPage` `FxPage` `FxHistory` `OilPage` | `market-tools.css` `fx-history.css` | ☐ |
| 12 | `/pulse` | `routes/Pulse` | `pulse.css` | ☐ |
| 13 | `/news`, `/news/[slug]`, `/learn`, `/learn/[slug]`, `/learn/trading-from-zero`, `/research/*` | `routes/NewsClient` `LearnIndex` `LearnGuide` `article/ArticleView` `cms/*` | `news.css` `learn.css` | ☐ |
| 14 | `/portfolio` `/watchlist` `/alerts` | `routes/Portfolio` `Watchlist` + alerts page | `portfolio.css` `watchlist.css` | ☐ |
| 15 | `/login` `/signup` `/forgot-password` `/verify-email` `/auth/reset` `/profile` | `auth/*` `routes/Account` `ResetPassword` | `auth.css` `profile.css` | ☐ |
| 16 | `/about` `/contact` `/legal` `/privacy` | `routes/AboutPage` `ContactPage` `info/LegalDoc` | `info.css` | ☐ |
| 17 | `/analysis/[sym]` | inline styles in the page | — | ☐ |
| 18 | system: `Toast` `Overlay` `Primitives` | `system/*` | `system.css` | ☐ |
| 19 | sweep: delete `globals.css` legacy blocks (lines after "Design system · base + components"), drop `data-theme` attribute, delete `public/fonts/*` | — | — | ☐ |

Every English route (`/en/...`) shares the component with its Arabic twin, so a row is done for both languages at once.

## Log

- 2026-09-16 · Foundation landed on branch `redesign/latitude`.
- 2026-09-16 · New site shell (`components/site/*`) and `/market` foundation on it; `AppFrame.REBUILT` is the migration ledger.
- 2026-09-16 · Dark mode added as role-token overrides (globals.css + design-tokens.css); un-rebuilt pages still show their OLD charcoal dark rules until their row is done.
- 2026-09-16 · Homepage: full-viewport blue opener with the character Earth faced at Iraq (canvas; `lib/landmask.ts`), Iraq's cells lit, ISX60/USD·IQD/oil/gold pinned over Iraq and sector clusters of real tickers pinned round the globe, one lit at a time and the four doors — الأسواق · البنوك والتمويل · الاقتصاد العراقي · تعلّم. Renders bare (no sidebar). Pages that do not exist yet (deposits, loans, cards, CBI, budget) show «قريباً».
