import { arDate } from '@/lib/date'

/**
 * `{{pension-deadline}}` — the days left in the pension-data-update window.
 *
 * Computed from the announcement date on every rebuild, so the number is never
 * a stale sentence in the prose. Past the deadline it says so instead of
 * counting into the negative, and it names the date either way: an extension
 * is announced as a new date, and this page is where readers check.
 */
const START = '2026-09-14'      // هيئة التقاعد الوطنية announcement
const DAYS = 90
const END = new Date(Date.parse(START) + DAYS * 86_400_000).toISOString().slice(0, 10)

export function DeadlineBlock() {
  const left = Math.ceil((Date.parse(END) - Date.now()) / 86_400_000)
  const over = left <= 0
  return (
    <aside className={`pen-dl ${over ? 'is-over' : ''}`} aria-label="المدة المتبقية">
      <p className="pen-dl-n id-num">{over ? 'انتهت المدة المعلنة' : `${left} يوماً`}</p>
      <p className="pen-dl-s">
        {over
          ? `المدة المعلنة (90 يوماً من ${arDate(START)}) انتهت في ${arDate(END)}. إن لم تُحدّث بياناتك بعد، راجع الرابط الرسمي أو أقرب مركز للهيئة — قد تُمدَّد المدة، ونحدّث هذه الصفحة عند صدور أي إعلان.`
          : `هي المتبقية من مدة التحديث المعلنة: 90 يوماً من ${arDate(START)}، أي حتى ${arDate(END)}. لا تؤجّل إلى الأسبوع الأخير — الرابط يزدحم.`}
      </p>
    </aside>
  )
}
