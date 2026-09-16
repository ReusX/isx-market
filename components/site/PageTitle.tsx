'use client'

import { useId, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'

/**
 * A page's title, with its standfirst moved behind a quiet «!».
 *
 * The standfirst under an h1 mostly restates what the page's first panel
 * says a moment later, and on a phone it pushes the page's own number below
 * the fold. So it moves here: the title carries the page, and the note is
 * one hover or one click away — the identity's own rule that detail goes
 * behind a click, applied to the copy as well as to the data.
 *
 * ⚠ THE NOTE IS COLLAPSED, NEVER CONDITIONALLY RENDERED.
 *
 * That distinction is the whole reason this is safe to do. The text is in
 * the server-rendered HTML whether or not a reader opens it, so a crawler
 * reads it as ordinary page copy; content behind a disclosure is indexed
 * normally under mobile-first indexing. Putting the same words in a `title`
 * attribute, or injecting them on hover, would take them out of the page's
 * text — those are the versions of this idea that cost something, and this
 * is deliberately not one of them. Keep it rendered; collapse it with CSS.
 *
 * Opens on hover of the button (not of the title — that would fire every
 * time the eye passes), on click, and on keyboard focus; closes when the
 * pointer leaves the block, so travelling from the button down onto the
 * note keeps it open. Escape closes it.
 */
export function PageTitle({ title, note, as: As = 'h1', className = 'id-h1' }: {
  title: string
  /** Omitted where a page has no standfirst — then there is no «!» at all,
      rather than a control that opens nothing. */
  note?: string
  as?: 'h1' | 'h2'
  className?: string
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const id = useId()

  if (!note) return <As className={className}>{title}</As>

  return (
    <div
      className={`iqp ${open ? 'is-open' : ''}`.trim()}
      onPointerLeave={() => setOpen(false)}
      onKeyDown={(e) => { if (e.key === 'Escape' && open) { setOpen(false) } }}
    >
      <div className="iqp-head">
        <As className={className}>{title}</As>
        <button
          type="button"
          className="iqp-btn"
          aria-expanded={open}
          aria-controls={id}
          aria-label={t.site.note}
          onPointerEnter={() => setOpen(true)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden="true">!</span>
        </button>
      </div>
      <p className="iqp-note" id={id}>{note}</p>
    </div>
  )
}
