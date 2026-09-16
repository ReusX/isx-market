# IQWealth redesign · tracker

Identity approved 16 September 2026, from the reference at latitude.xyz.
The approved mockup is [`docs/design/direction.html`](design/direction.html);
open it in a browser — it is the answer to "what should this look like".

## The identity in one screen

| | Value | Rule |
|---|---|---|
| Page | `--cream #FFFBF7` | The ground. Flat, no gradient. |
| Ink | `--navy #002664` | All text. Secondary at 64 %, muted at 42 %. |
| Accent | `--blue #146BFD` | A **block** (hero, one primary button). Never text. One per screen. |
| Rising | `--moss #E1EFAC` chip / `--up #157A52` text | Chip when there is a ground; text when not. |
| Falling | `--sand #F3DEC5` chip / `--down #C0392B` text | Same. |
| Border | navy 14 % | Hairlines. **No shadows anywhere.** |
| Type | Readex Pro, one face | 200–300 display · 400 body · 500 controls. Nothing bold. No positive tracking on Arabic. Figures tabular. |
| Shape | 54 px pills · 32 px blocks · 16 px panels · 8 px chips | |
| Density | one row = one fact | Detail goes behind a click. Prefer a table to cards. |
| Theme | light + dark | Dark is the same identity turned over: deep-navy page `#06173A`, cream ink, same blue block, same pills, no shadows. Style through ROLE tokens (`--page`, `--ink`, `--border`, `--primary-bg`, `--moss`…), never primitives. `data-theme` is always stamped (stored choice, else OS). |

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
2. Wrap it in `<SiteShell>`; assemble from `.id-*` (identity.css) plus a small `styles/<page>.css` with a fresh prefix (check it is unused: `grep -ho "\.PREFIX-[a-z]*" styles/*.css`). Class names already taken by old stylesheets include `sn-`, `sf-`, `mk-`, `gh-`, `hm-`, `mt-`, `cd-`, `st-`.
3. Strings go in the dictionaries (`lib/i18n/messages/{ar,en}`); the i18n gate rejects Arabic literals in components.
4. Point the route (`app/(ar)/…/page.tsx` and `app/(en)/en/…/page.tsx`) at the new component; add the route to `AppFrame.REBUILT` so the old frame steps aside.
5. Gates: `check:tokens`, `check:i18n` (dev server on 3300), `check:routes`; phone width; both themes. Tick the row here.

## Pages — one by one

Order is by traffic and by what other pages borrow from. Shell first because every page wears it.

| # | Route(s) | Component(s) | Stylesheet(s) to replace | Status |
|---|---|---|---|---|
| 1 | shell (nav, mobile menu, foot) | NEW `site/SiteNav` `SiteFoot` `SiteShell` (`styles/site.css`) — rebuilt pages wear this; old `shell/*` + `shell.css` are deleted when `AppFrame.REBUILT` covers every route | — | ☑ 2026-09-16 (search not yet rebuilt) |
| 2 | `/` | `routes/Landing` (+ `home/Globe`) | `landing.css` · old `HomePage`/`home.css` kept only until /market reuses its modules | ☑ 2026-09-16 |
| 3 | `/market` | NEW `site/MarketPage` (`styles/markets.css`): session block, door rail, board (search + sector pills + one-row-one-fact table) | old `MarketBoard`/`market.css` unused, delete in sweep | ☑ 2026-09-16 foundation |
| 4 | `/c/[sym]` | `routes/CompanyDetail` `company/CompanyProfile` `company/CompanyChart` | `company.css` `chart-engine.css` `panels.css` | ☐ |
| 5 | `/c/[sym]/financials` | `routes/CompanyFinancials` | `financials.css` | ☐ |
| 6 | `/companies` | `routes/CompaniesPage` | in `globals.css` (companies directory blocks) | ☐ |
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
