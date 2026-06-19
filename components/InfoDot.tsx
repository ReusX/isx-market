'use client'

import { useState } from 'react'

/** Small clickable "؟" that toggles a popover explaining a metric. */
export default function InfoDot({ text, ar = true }: { text: string; ar?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        aria-label={ar ? 'شرح' : 'info'}
        style={{
          width: 15, height: 15, borderRadius: '50%', border: '1px solid var(--line)',
          background: open ? 'var(--brand)' : 'transparent', color: open ? '#fff' : 'var(--ink4)',
          fontSize: 10, fontWeight: 800, lineHeight: 1, cursor: 'pointer', padding: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >؟</button>
      {open && (
        <>
          {/* click-away backdrop */}
          <span onClick={e => { e.stopPropagation(); setOpen(false) }}
            style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <span dir={ar ? 'rtl' : 'ltr'} style={{
            position: 'absolute', zIndex: 41, top: 'calc(100% + 6px)',
            insetInlineStart: '50%', transform: 'translateX(50%)',
            width: 230, maxWidth: '70vw', padding: '10px 12px',
            background: 'var(--surf3, #1f2937)', color: 'var(--ink, #e5e7eb)',
            border: '1px solid var(--line)', borderRadius: 10,
            fontSize: 12, fontWeight: 500, lineHeight: 1.6, textAlign: ar ? 'right' : 'left',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)', whiteSpace: 'normal',
          }}>{text}</span>
        </>
      )}
    </span>
  )
}
