import type { ReactNode } from 'react'

/**
 * The data-state vocabulary — the words this product uses for absence.
 *
 * Ported from the approved reference app. These exist as shared primitives
 * precisely so that individual routes stop improvising them: before this, each
 * page invented its own answer to "what do we render when there is no value",
 * and the answers disagreed.
 *
 * ══ THE RULE THAT MATTERS MOST ═══════════════════════════════════════════
 *   `—`  we do not know
 *   `0`  we know, and it is zero
 *
 * These are different facts and must never be substituted for one another. A
 * company that did not trade today has NO closing price; writing `0` says it
 * traded at nothing, which is a false statement about a market. In aggregates
 * the reverse is worse: a sector showing `—` for foreign inflow reads as
 * missing data when the true answer is that nobody bought.
 *
 * Four distinct absences, four treatments:
 *   Unavailable  we have no value            `—` with a reason
 *   Zero         a real, measured zero       `0`, styled like any number
 *   NoActivity   measured, and it is nothing `0` + «لا نشاط»
 *   ModuleError  the upstream feed failed    named, and survivable
 *
 * `<bdi>` on every one of them. Arabic reorders a bare `—` or a signed number
 * and the sign lands on the wrong side.
 */

/** We do not have this value. */
export function Unavailable({ why }: { why?: string }) {
  const label = why ?? 'غير متاح'
  return <bdi className="ds-na" title={label} aria-label={label}>—</bdi>
}

/** A real, measured zero. Styled as an ordinary number, because it is one. */
export function Zero() {
  return <bdi className="ds-zero">0</bdi>
}

/** Measured, and the measurement is «nothing happened». */
export function NoActivity({ label = 'لا نشاط' }: { label?: string }) {
  return (
    <span className="ds-idle">
      <bdi>0</bdi>
      <small>{label}</small>
    </span>
  )
}

/**
 * Freshness · one chip for the whole product.
 *
 * Never show stale data as live. A timestamp alone does not work — a reader
 * cannot judge whether «آخر رصد 11:04» is fine without knowing the cadence —
 * so the chip states the verdict AND the observation, and the tone carries it
 * a third time.
 */
export function Freshness({
  tone,
  label,
  stamp,
}: {
  tone: 'live' | 'recent' | 'stale' | 'unknown'
  label: string
  stamp?: string
}) {
  return (
    <span className={`ds-fresh is-${tone}`}>
      <i aria-hidden="true" />
      <span>{label}</span>
      {stamp ? <bdi>{stamp}</bdi> : null}
    </span>
  )
}

/**
 * Partial data · the reader must know the result is incomplete without being
 * blocked by it.
 *
 * Say WHAT is missing. «٣ شركات بلا سعر» beats «بيانات جزئية», because a
 * reader who knows the shape of the gap can decide whether it matters to them.
 */
export function PartialNotice({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="ds-partial" role="status">
      <i aria-hidden="true">△</i>
      <span>{text}</span>
      {onRetry ? <button type="button" onClick={onRetry}>أعد المحاولة</button> : null}
    </div>
  )
}

/**
 * A module that failed while the rest of the page survived.
 *
 * Deliberately small and inline. Escalating one failed panel to the full 500
 * page throws away everything that DID load, which is the most common way an
 * error state makes things worse than the error.
 */
export function ModuleError({ what, onRetry }: { what: string; onRetry?: () => void }) {
  return (
    <div className="ds-modfail" role="status">
      <strong>تعذّر تحميل {what}</strong>
      <span>بقية الصفحة تعمل.</span>
      {onRetry ? <button type="button" onClick={onRetry}>أعد المحاولة</button> : null}
    </div>
  )
}

/**
 * Empty · what is empty, why if known, and ONE action.
 *
 * One action, not three. An empty state offering a menu of options has decided
 * the user is lost; one offering the single most likely next step has decided
 * to help.
 */
export function EmptyState({
  title,
  why,
  action,
}: {
  title: string
  why?: string
  action?: ReactNode
}) {
  return (
    <div className="ds-empty">
      <strong>{title}</strong>
      {why ? <span>{why}</span> : null}
      {action}
    </div>
  )
}

/**
 * Disabled, with the reason attached.
 *
 * A dead-looking control with no explanation is the worst state in an
 * interface: it reads as a bug, so the user retries it. The reason travels
 * with the control — `title` for the pointer, `aria-describedby` for the
 * screen reader, and a visible note when there is room, because a tooltip is
 * not available to a touch user at all.
 */
export function DisabledControl({
  reason,
  id,
  children,
  showNote = false,
}: {
  reason: string
  id: string
  children: ReactNode
  showNote?: boolean
}) {
  return (
    <span className="ds-disabled">
      <span title={reason} aria-describedby={id}>{children}</span>
      <span id={id} className={showNote ? 'ds-why' : 'sr-only'}>{reason}</span>
    </span>
  )
}

/**
 * Skeletons · one motion language, many shapes.
 *
 * The shape differs per structure — a table is not an article — but the motion
 * never does. `prefers-reduced-motion` stops it entirely, in the stylesheet.
 */
export function Skeleton({
  shape,
  rows = 4,
}: {
  shape: 'text' | 'rows' | 'table' | 'chart' | 'card'
  rows?: number
}) {
  return (
    <div className={`ds-skel is-${shape}`} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => <span key={i} />)}
    </div>
  )
}

/**
 * A signed value.
 *
 * Direction is never carried by colour alone — the sign is part of the text,
 * so the meaning survives greyscale, a colour-blind reader, and a screenshot.
 * `<bdi>` because Arabic will otherwise move the sign to the wrong end.
 */
export function SignedValue({ value, format }: { value: number | null; format?: (n: number) => string }) {
  if (value == null) return <Unavailable />
  if (value === 0) return <Zero />
  const cls = value > 0 ? 'ds-up' : 'ds-down'
  const text = format ? format(value) : `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}%`
  return <bdi className={`ty-num ${cls}`}>{text}</bdi>
}
