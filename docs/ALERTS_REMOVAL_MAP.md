# Alerts — removal map

**Decision (owner, 14 Aug 2026).** Alerts stay out of the redesigned product.
Every redesigned entry point is removed; the production `/alerts` route stays
live but **unlinked**, as a compatibility route, until a usage and internal-link
review is done. This is an explicit functional-consistency exception to the
frozen-page rule.

Nothing in this file is executed yet. `/alerts` and its links are untouched on
this branch — the removals happen in the shell phase, when the navigation is
rebuilt, so that no user loses a link before the replacement exists.

---

## Every entry point, enumerated from the tree

The decision note named three. The design-repo audit found seven. A sweep of
the production tree brings it to **nine**, and the new ones are the same shape
as the ones that were missed before: things that are not links.

### In production — `isx-market`

| # | site | what it is | action |
|---|---|---|---|
| 1 | `components/layout/AppShell.tsx:85` | sidebar item, `bell` icon, «جديد» badge | remove with the shell rebuild |
| 2 | `components/layout/AppShell.tsx:399` | **a bell button in the topbar with no `onClick` and no `aria-label`** | delete |
| 3 | `app/profile/page.tsx:87` | `SHORTCUTS` row → `/alerts` | remove with the profile redesign |
| 4 | `app/profile/page.tsx:56` | signed-out copy promising «وتنبيهاتك» | reword |
| 5 | `app/alerts/` | the route, its metadata and its `Breadcrumbs` | keep, unlinked |

Site 2 is worth stating plainly: it is a notification bell that has never done
anything. It is not a dead link, it is a dead *control* — and because it also
carries no accessible name, a screen reader announces an unlabelled button that
does nothing when pressed. It goes whatever happens to Alerts.

### In the reference app — `iqwealth-design`

| # | site | what it is |
|---|---|---|
| 6 | `app/companies/[ticker]/CompanyDetailPage.tsx:332` | «تنبيه سعري» on the masthead |
| 7 | `app/watchlists/Watchlist.tsx:388` | row menu → `/alerts` |
| 8 | `app/watchlists/Watchlist.tsx:345` | `wl-badge is-alert` «تنبيه» row badge |
| 9 | `app/watchlists/watchlistData.ts:188` | filter option `{ id: "alerted", label: "بتنبيه" }` |
| — | `app/portfolio/Portfolio.tsx:601` | row menu → «إضافة تنبيه سعر» |
| — | `app/alerts/`, `app/personal/PersonalWorkspace.tsx` | leftovers from the original ZIP; never migrate |

The filter option is the one that must not survive. A watchlist filterable by
«بتنبيه» when nothing can create an alert is a control that always returns an
empty list — worse than a dead link, because it looks like it worked.

---

## What retiring the route would actually cost — less than feared

Checked, not assumed:

- **`/alerts` is not in `app/sitemap.ts`.** Neither are `/portfolio` or
  `/watchlist`.
- **`app/alerts/layout.tsx` already sets `robots: { index: false, follow: true }`.**

So the route is already invisible to search by design. It carries full title,
description, keywords and canonical — but a `noindex` page absent from the
sitemap has no ranking to protect. Of the six removal candidates in P1-5,
`/alerts` is the only one whose redirect decision is nearly free. The others
(`/companies`, `/banks`, `/research`, `/charts`, `/analysis`) are all in the
sitemap and still need the traffic and backlink audit.

## What must NOT be changed yet

`lib/portfolio.ts` keeps `useAlerts`, and `profiles.price_alerts` keeps its
data. Removing the UI is reversible; dropping a stored column is not, and the
usage review has not happened.

⚠ **The legal drafts are not part of this change, and must not be.** The
Privacy and Terms drafts describe التنبيهات in six places. Those statements are
**true for as long as the route works**, so they stay accurate through the whole
compatibility period. They are revisited at the moment `/alerts` is actually
retired — not when its entry points come out. That is a separate, later change,
and it is written down here because nobody will remember it otherwise.
