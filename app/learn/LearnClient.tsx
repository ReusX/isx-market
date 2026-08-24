'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { filterLearn, learnDate, type LearnItem, type LearnPath } from '@/lib/learn'
import './learn.css'

/**
 * تعلّم — the Learn landing page. A direct transplant of the approved design.
 *
 * The architecture the live page does not have:
 *
 *   ابدأ من هنا    one entry point, sized for a real path
 *   أحدث المقالات   the newest few, in a wider row
 *   جميع المقالات   the browsable library, with search
 *
 * ── The state that matters most here ──────────────────────────────────────
 * The library ships with nothing in it — WordPress category 4 holds zero
 * posts. «المحتوى قيد الإعداد» is therefore the page's normal state, not an
 * afterthought, and the search architecture stays visible so the page still
 * reads as a section rather than a hole.
 *
 * `libraryOk` separates that from an outage. An empty library and a CMS that
 * did not answer are different facts: the first says "nothing is written
 * yet", the second says "we could not read it". Collapsing them would tell
 * the reader the wrong one roughly half the time.
 *
 * The reference's topic filter is not here — see the note in `lib/learn.ts`.
 * Its four labels are placeholders over a taxonomy that does not exist.
 */
export function LearnClient({
  items, path, libraryOk,
}: {
  items: LearnItem[]
  path: LearnPath
  libraryOk: boolean
}) {
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(6)

  const results = useMemo(() => filterLearn(items, query), [items, query])
  const filtering = query.trim() !== ''
  const visible = results.slice(0, shown)

  function reset() { setQuery(''); setShown(6) }

  return (
    <main className="ln-page iq-page">
      <header className="ln-head">
        <div className="ln-title">
          <h1>تعلّم</h1>
        </div>
      </header>

      {/* ── ابدأ من هنا · the one real guide the product has ─────────────── */}
      <section className="ln-start" aria-labelledby="ln-start-h">
        <h2 id="ln-start-h">ابدأ من هنا</h2>
        <Link className="ln-path" href={path.href}>
          <span className="ln-path-copy">
            <strong>{path.title}</strong>
            <em>{path.summary}</em>
            <span className="ln-path-meta">
              <bdi>{path.sections}</bdi> أقسام
              <i aria-hidden="true">·</i>
              <bdi>{path.minutes}</bdi> دقيقة
            </span>
          </span>
          <span className="ln-path-go">ابدأ <i aria-hidden="true">‹</i></span>
        </Link>
      </section>

      {/* ── أحدث المقالات · a wider row, not the same grid ───────────────── */}
      {items.length > 0 ? (
        <section className="ln-latest" aria-labelledby="ln-latest-h">
          <h2 id="ln-latest-h">أحدث المقالات</h2>
          <ul className="ln-feature">
            {items.slice(0, 3).map((l) => (
              <li key={l.slug}>
                <Link href={l.href}>
                  <strong>{l.title}</strong>
                  {l.summary ? <em>{l.summary}</em> : null}
                  <span className="ln-card-meta">
                    <bdi>{l.minutes}</bdi> دقائق
                    {learnDate(l.updated) ? (
                      <>
                        <i aria-hidden="true">·</i>
                        آخر تحديث {learnDate(l.updated)}
                      </>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── جميع المقالات · the browsable library ────────────────────────── */}
      <section className="ln-browse" aria-labelledby="ln-browse-h">
        <div className="ln-browse-head">
          <h2 id="ln-browse-h">جميع المقالات</h2>
          {/* Disabled while there is nothing to search — and the reason
              travels with the control. A dead-looking input with no
              explanation reads as a bug, and the user retries it. */}
          <label className="ln-search">
            <span className="sr-only">ابحث في التعلّم</span>
            <input value={query} placeholder="ابحث في التعلّم"
              onChange={(e) => { setQuery(e.target.value); setShown(6) }}
              disabled={items.length === 0}
              aria-describedby={items.length === 0 ? 'ln-search-why' : undefined}
              title={items.length === 0 ? 'لا توجد مقالات للبحث فيها بعد.' : undefined} />
          </label>
          {items.length === 0 ? (
            <span id="ln-search-why" className="sr-only">لا توجد مقالات للبحث فيها بعد.</span>
          ) : null}
        </div>

        {filtering ? (
          <p className="ln-filtered">
            <bdi>{results.length}</bdi> من <bdi>{items.length}</bdi>
            <button type="button" onClick={reset}>مسح</button>
          </p>
        ) : null}

        {!libraryOk ? (
          /* The CMS did not answer. This is not «no articles» and must not
             read as it — and it names nothing about the failure itself. */
          <div className="ln-partial" role="status">
            <i aria-hidden="true">△</i>
            تعذّر تحميل المكتبة حالياً. «ابدأ من هنا» أعلاه لا يزال متاحاً.
          </div>
        ) : items.length === 0 ? (
          <div className="ln-empty">
            <strong>المحتوى قيد الإعداد</strong>
            <span>ستظهر المقالات هنا فور نشرها.</span>
          </div>
        ) : results.length === 0 ? (
          <div className="ln-empty">
            <strong>لا نتائج</strong>
            <span>جرّب كلمة أخرى أو امسح البحث.</span>
            <button type="button" className="ln-reset" onClick={reset}>مسح البحث</button>
          </div>
        ) : (
          <>
            <ul className="ln-list">
              {visible.map((l) => (
                <li key={l.slug}>
                  <Link href={l.href}>
                    <span className="ln-row-copy">
                      <strong>{l.title}</strong>
                      {l.summary ? <em>{l.summary}</em> : null}
                    </span>
                    <span className="ln-row-meta">
                      <bdi>{l.minutes}</bdi> دقائق
                    </span>
                    <i className="ln-row-go" aria-hidden="true">‹</i>
                  </Link>
                </li>
              ))}
            </ul>
            {results.length > visible.length ? (
              <button type="button" className="ln-more" onClick={() => setShown((n) => n + 6)}>
                عرض المزيد
              </button>
            ) : null}
          </>
        )}
      </section>
    </main>
  )
}
