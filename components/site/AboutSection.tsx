'use client'

/**
 * The «عن هذه الأرقام» block every data page ends with, collapsed.
 *
 * It is the page's methodology — where the numbers come from, what they do
 * and do not mean, which figure is deliberately absent. That matters, and
 * it is also four paragraphs nobody wants open by default at the foot of a
 * page they came to for a number.
 *
 * ⚠ NATIVE <details>, deliberately. The prose stays in the markup whether or
 * not it is open, so it is still the page's text for a crawler — this copy
 * is a real part of what these pages rank for. Rendering it conditionally
 * would take it out of the page; collapsing it does not.
 */
export function AboutSection({ title, body }: { title: string; body: readonly string[] }) {
  return (
    <details className="iqa id-read">
      <summary className="iqa-sum">
        <h2 className="id-h2">{title}</h2>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="iqa-chev"><path d="M6 9l6 6 6-6" /></svg>
      </summary>
      <div className="iqa-body">
        {body.map((tx, i) => <p key={i} className="id-body">{tx}</p>)}
      </div>
    </details>
  )
}
