# The two-root-layout 404 trade

**Status: no clean Next 14 solution exists. The trade is accepted and the
behaviour is documented here rather than faked.**

## What the architecture buys

`/en` must serve a document whose `<html>` carries `lang="en" dir="ltr"`. A
single root layout cannot know its own language without `headers()`, and
`headers()` opts every route into dynamic rendering — it would have taken all
46 statically prerendered routes with it. So the app has two root layouts,
`app/(ar)` and `app/(en)`, each rendering its own `<html>`.

## What it costs

Next 14.2 cannot render a custom `not-found` **inside a layout** when an app
has two root layouts: it cannot know which of the two roots to wrap the page
in, so it falls back to its own bare error document — `<html id="__next_error__">`
with no `lang`, no fonts, no frame.

## Four approaches tested, all against a real production build

| Approach | Result |
|---|---|
| `not-found.tsx` at the root of each route group | bare document; only its `metadata` survives |
| `not-found.tsx` nested under the catch-all segment | bare document |
| `app/not-found.tsx` at the true top level | **build error** — "not-found.tsx doesn't have a root layout" |
| A segment `layout.tsx` beside the nested `not-found.tsx` | bare document |

None of the four avoids the four things the brief forbids: making the static
tree dynamic, returning HTTP 200 for a missing page, breaking the two-root
locale layout, or an SEO-compromising middleware hack.

## What was measured on the pre-change baseline

A production build of `5dd2849` was served and probed. `/c/BOGUS` — and every
other `notFound()` thrown from a dynamic route — **already** produced the bare
document before this work began. Only unmatched TOP-LEVEL URLs previously got
the framed 404. That is the whole of the regression, and it is narrower than
it first appears.

## What holds today

- `/does-not-exist` and `/en/does-not-exist` both return a real **HTTP 404**,
  not a 200 that looks like one. Asserted by `scripts/i18n-seo.mjs`.
- Both are **noindex** and emit **no canonical**, so no mistyped URL claims to
  be a duplicate of the homepage. Also asserted by that gate.
- `/en/*` misses are answered with ENGLISH metadata rather than Arabic, via
  `app/(en)/en/[...rest]`, so an English reader who mistypes a ticker is not
  handed an Arabic page title.
- `components/system/RouteStates.tsx` stays wired to both `not-found.tsx`
  files. It renders nothing today and is one framework release from rendering
  again; deleting it would mean rebuilding it then.

## If this is revisited

Next 15 introduces a global not-found that resolves this directly. Until the
app is on it, the honest options are the current one, or giving up correct
`lang`/`dir` on ~30 indexable English pages. The second is the worse trade.
