# Removed-route retirement audit

Audited on `implement/iqwealth-redesign` after Batch D (`5293069`), against the
running app rather than the migration plan.

## The finding, up front

**Nothing here should be retired yet, and no redirect is implemented.**

The redesign removed six families from the *navigation*. It did not remove them
from the *product*: every one of the ten URLs below still returns 200, still
renders, and — with one exception — is still indexable and still in the
sitemap. Four of them are still linked from migrated pages.

Retiring a URL that works, serves real content and carries accumulated search
equity is a decision with a cost, and none of the candidates has an unambiguous
replacement to redirect to. Inventing one to avoid a 404 is the failure mode the
brief names, so this audit stops at recommendations.

Verified after this audit:

- ✅ **No removed route appears in the primary navigation.** `lib/navigation.ts`
  is the single manifest behind `SideNav`, `MobileNav` and the footer, and it
  lists only `/`, `/market`, `/screener`, `/statistics`, `/heatmap`, `/pulse`,
  `/news`, `/portfolio`, `/watchlist`, `/fx`, `/gold`, `/oil`, `/learn`, plus
  the four information pages.
- ✅ **No canonical points at a retired URL.** Every route below is
  self-canonical; nothing canonicalises to something that 404s.
- ✅ **No redirect loops.** The only redirects are `/en` → `/`,
  `/en/:path*` → `/:path*`, `/c/MTMT` → `/companies`, `/c/MTRA` → `/companies`.
  All four land on live 200s.
- ⚠️ **Sitemap.** Five of these are still emitted. That is correct *because they
  are not retired*; the moment any of them is, its `sitemap.ts` entry must go in
  the same commit.

---

## The routes

### `/companies` — **NOT a removed route. Keep.**

| | |
|---|---|
| Status | 200, indexable, self-canonical, in sitemap (priority 0.9) |
| Inbound links | `app/c/[sym]/CompanyClient.tsx:194` and `app/c/[sym]/financials/FinancialsClient.tsx:110` (breadcrumb «الشركات»), `app/c/[sym]/not-found.tsx:16` |
| Also | **The 301 target for `/c/MTMT` and `/c/MTRA`** in `next.config.js` — two delisted tickers Google discovered from an old source |
| Replacement | none needed |
| **Action** | **Keep.** It was never removed from the product — only from the sidebar, because the global search covers company lookup. It is a live directory of 100+ companies, it is a breadcrumb parent for every company page, and it is a redirect destination. Retiring it would break two existing 301s. Its chrome is still pre-redesign (`terminal-shell`); that is a design gap, not a retirement question. |

### `/charts` — **Keep, linked.**

| | |
|---|---|
| Status | 200, indexable, self-canonical, in sitemap (0.9) |
| Inbound links | `components/design/IndexChart.tsx:353` — «المخطط الكامل», rendered on the **homepage** |
| Replacement | `/c/[sym]` carries ChartEngine per company, but `/charts` is the index-level full chart — not the same page |
| **Action** | **Keep.** Reachable from the homepage in one click. Not orphaned, not a retirement candidate. |

### `/statistics/ownership` and `/statistics/shareholders` — **Keep, linked.**

| | |
|---|---|
| Status | Both 200, indexable, self-canonical, both in sitemap (0.7) |
| Inbound links | `app/statistics/OwnershipPanel.tsx:99`, `app/statistics/MajorShareholdersPanel.tsx:75`, and two links from `foreign-flow/ForeignFlowClient.tsx:426–427` |
| **Action** | **Keep.** These are detail views of migrated panels and are linked from two migrated routes. The migration recorded them as "designed as a shell only; no approved detail design exists" — they are **undesigned, not removed**. They render in `terminal-shell` chrome, which is a visible seam from `/statistics`. |

### `/banks` — **Keep, temporarily unlinked. Editorial decision needed.**

| | |
|---|---|
| Status | 200, indexable, self-canonical, in sitemap (0.7) |
| Inbound links | **none** |
| SEO value | Its own title and description target «أسهم البنوك» / «المصارف العراقية المدرجة» — a distinct, high-intent Arabic query that no migrated page targets. `/screener` and `/heatmap` cover sectors generically; neither claims this phrase. |
| Nearest replacement | `/screener` filtered to the banking sector — but **the screener has no sector deep-link**, so there is no URL to redirect to that lands the reader on the same thing. |
| **Action** | **Keep, unlinked.** Do NOT redirect: the only candidate target cannot reproduce the page. Either restore a link to it, give the screener a sector parameter and then redirect, or 410 it and accept the lost query. That is an editorial call, not a cleanup one. |

### `/research` and `/research/[slug]` — **Keep, temporarily unlinked.**

| | |
|---|---|
| Status | Both 200, indexable, self-canonical; `/research` in sitemap (0.8), article URLs emitted from `allPosts('research')` |
| Inbound links | **none** |
| Content | WordPress category 3 currently holds **exactly one** published post (`arqam-one-iraq-stock-market`), verified live |
| Nearest replacement | `/news` is a different section (category 2) with its own 52 articles; folding research into it would change what the URL means |
| **Action** | **Keep, unlinked.** One real article is live and indexed. Retiring the section would 404 a working URL for no gain. `/research/[slug]` is the last consumer of `components/cms/ArticlePage` — the pre-redesign article template — so if research is ever retired, that component goes with it. |

### `/analysis` and `/analysis/[sym]` — **Keep, temporarily unlinked. Decision needed.**

| | |
|---|---|
| Status | Both 200, indexable, self-canonical; `/analysis` in sitemap (0.8), **`/analysis/[sym]` is not** |
| Inbound links | **none** |
| Backing | `app/api/analysis/[sym]/route.ts`, which calls the Anthropic API (`ANTHROPIC_API_KEY`, `CLAUDE_MODEL`) to generate a per-company written analysis |
| Nearest replacement | `/c/[sym]` is the migrated company page, but it carries no generated narrative — the two are not equivalent |
| **Action** | **Keep, unlinked.** Note the asymmetry: the hub is in the sitemap while none of its ~100 company children are, so the section advertises an entry point to pages crawlers are not told about. Whether this feature stays is a product decision — it costs API spend per render and it is the one surface that publishes machine-written commentary about named securities. Flag it, do not silently retire it. |

### `/alerts` — **Intentional compatibility route. Documented, kept.**

| | |
|---|---|
| Status | 200, **`noindex, follow`**, self-canonical, **not in the sitemap** |
| Inbound links | **none** — removed from the navigation manifest by the redesign |
| Function | Still works: `useAlerts` in `lib/portfolio.ts`, localStorage plus the `profiles.price_alerts` JSONB column, evaluated against live prices |
| **Action** | **Keep as an intentional compatibility route.** It carries no search equity to lose (already `noindex`, never in the sitemap), and it is the only way an existing user with saved alerts can reach them. No UI is resurrected: it is not in the sidebar, the mobile sheet, the footer or the search. Per §9 the backend is untouched — `price_alerts` stays, and `/privacy` still discloses it truthfully. |

---

## Summary table

| Route | 200 | Indexable | In sitemap | Inbound links | Action |
|---|---|---|---|---|---|
| `/companies` | ✅ | ✅ | ✅ | 3 + 2 redirect targets | **Keep** |
| `/charts` | ✅ | ✅ | ✅ | 1 (homepage) | **Keep** |
| `/statistics/ownership` | ✅ | ✅ | ✅ | 2 | **Keep** |
| `/statistics/shareholders` | ✅ | ✅ | ✅ | 2 | **Keep** |
| `/banks` | ✅ | ✅ | ✅ | 0 | **Keep unlinked** — decision needed |
| `/research` | ✅ | ✅ | ✅ | 0 | **Keep unlinked** |
| `/research/[slug]` | ✅ | ✅ | ✅ (per post) | 0 | **Keep unlinked** |
| `/analysis` | ✅ | ✅ | ✅ | 0 | **Keep unlinked** — decision needed |
| `/analysis/[sym]` | ✅ | ✅ | ❌ | 0 | **Keep unlinked** — decision needed |
| `/alerts` | ✅ | ❌ noindex | ❌ | 0 | **Keep — compatibility route** |

**Redirects implemented by this audit: none.** No candidate has an unambiguous
replacement, and every URL still serves the content it claims to.

## If you decide to retire one later

Do all four in the same commit, or the site will disagree with itself:

1. Remove its `sitemap.ts` entry.
2. Remove any remaining inbound `<Link>`.
3. Choose **410** (feature genuinely gone, no successor) or **301** (a successor
   URL renders the same thing) — never a 301 to a page that does not.
4. Re-run `npm run check:routes`, which will show the route count drop.
