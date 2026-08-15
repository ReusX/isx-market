'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { searchCompanies, splitMatch, type CompanyHit } from '@/lib/companySearch'
import { useOverlay } from '@/components/system/Overlay'

/**
 * Global company search.
 *
 * The reference app's audit of its own palette is the specification here, and
 * it is worth restating because every item was a thing the UI ADVERTISED and
 * did not do:
 *
 *   · the footer promised «↑ ↓ للتنقل» and «↵ للفتح» — neither key was wired
 *   · Escape closed nothing; the visible ESC chip was a mouse target
 *   · focus never returned, so closing dropped a keyboard user at the top of
 *     the document
 *   · the `/` shortcut in the trigger's <kbd> was not bound
 *   · no match highlighting, so results looked identical whatever you typed
 *   · Arabic matched with a raw `includes`, so «الرافدين» missed «مصرف
 *     الرافدين» on a different alef
 *
 * All of it is implemented here. The RESULT SET is unchanged from production —
 * company name, ticker and sector from `public/data/companies.json` — because
 * the product has no global index behind news or Learn, and a search box that
 * silently covers a third of the site is worse than one with an honest scope.
 */

function Marked({ label, query }: { label: string; query: string }) {
  const parts = splitMatch(label, query)
  if (!parts) return <>{label}</>
  return <>{parts[0]}<mark>{parts[1]}</mark>{parts[2]}</>
}

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const close = useCallback(() => { onClose(); setQuery(''); setCursor(0) }, [onClose])
  const overlayRef = useOverlay(open, close)

  const results = useMemo(() => searchCompanies(query), [query])

  useEffect(() => { setCursor(0) }, [query])

  const go = useCallback((hit: CompanyHit) => {
    close()
    router.push(`/c/${hit.sym}`)
  }, [close, router])

  function onKeyDown(e: React.KeyboardEvent) {
    if (!results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => (c + 1) % results.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => (c - 1 + results.length) % results.length) }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[cursor]) }
    // Escape is handled by useOverlay, which also restores focus to the trigger.
  }

  if (!open) return null

  const listId = 'gs-list'

  return (
    <div className="ov-scrim gs-scrim" onMouseDown={close}>
      <div
        ref={overlayRef}
        className="gs-panel"
        role="dialog"
        aria-modal="true"
        aria-label="البحث عن شركة"
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="gs-inputrow">
          <span className="gs-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            data-autofocus
            className="gs-input"
            type="search"
            value={query}
            placeholder="ابحث عن شركة أو رمز…"
            aria-label="ابحث عن شركة أو رمز"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-activedescendant={results.length ? `gs-opt-${cursor}` : undefined}
            aria-autocomplete="list"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button type="button" className="gs-esc" onClick={close}>إغلاق</button>
        </div>

        <div className="gs-results" id={listId} role="listbox" aria-label="النتائج">
          {!query ? (
            <p className="gs-hint">اكتب اسم شركة أو رمزها.</p>
          ) : results.length === 0 ? (
            <p className="gs-hint">لا نتائج لـ «{query}».</p>
          ) : (
            results.map((hit, i) => (
              <button
                key={hit.sym}
                id={`gs-opt-${i}`}
                type="button"
                role="option"
                aria-selected={i === cursor}
                className={`gs-row ${i === cursor ? 'is-on' : ''}`.trim()}
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(hit)}
              >
                <bdi className="gs-sym" dir="ltr"><Marked label={hit.sym} query={query} /></bdi>
                <span className="gs-name"><Marked label={hit.ar} query={query} /></span>
                {hit.sec ? <span className="gs-sec">{hit.sec}</span> : null}
              </button>
            ))
          )}
        </div>

        <div className="gs-foot" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> للتنقل</span>
          <span><kbd>↵</kbd> للفتح</span>
          <span><kbd>Esc</kbd> للإغلاق</span>
        </div>
      </div>
    </div>
  )
}
