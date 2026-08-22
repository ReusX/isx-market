"use client";

import { type ReactNode } from "react";
import {
  freshnessLabel, freshnessLine, freshnessTone,
  type Freshness, type Source,
} from "@/lib/marketTools";

/**
 * Shared chrome for سعر الصرف · الذهب · النفط.
 *
 * Deliberately small. The family resemblance comes from the head, the
 * freshness chip, the meta line and the disclosures — not from a shared
 * layout, because each page's composition is its own. §6
 *
 * The previous version of these pages put provenance in four places per page.
 * Everything here exists to say it ONCE, next to the number it describes. §22
 */

/* ── Head · one line, then the lede, then out of the way ──────────────────── */
export function ToolHead({
  title, lede, freshness, actions, pending, unavailable,
}: {
  title: string;
  lede?: ReactNode;
  freshness: Freshness;
  actions: ReactNode;
  /** While the read is in flight the observation date is not yet known, so the
      chip says that rather than asserting a freshness it has not seen. */
  pending?: boolean;
  /** Nothing was read at all. «أحدث رصد» over a page that says the prices are
      unavailable is two claims that cannot both hold. §23 */
  unavailable?: boolean;
}) {
  return (
    <header className="mt-head">
      <div className="mt-title">
        <div className="mt-title-row">
          <h1>{title}</h1>
          {pending
            ? <span className="mt-fresh is-pending">جارٍ القراءة</span>
            : unavailable
              ? <span className="mt-fresh is-stale"><i aria-hidden="true">△</i>غير متاح</span>
              : <FreshnessChip freshness={freshness} />}
        </div>
        {lede ? <p>{lede}</p> : null}
      </div>
      <div className="mt-head-actions">{actions}</div>
    </header>
  );
}

/**
 * The chip that replaces «مباشر».
 *
 * Three tones, no green dot on any of them — a once-daily source behind a
 * three-hour cache is not a live feed. The shape carries the state as well as
 * the colour (◆ current · ◇ carried · △ stale), and the exact observation date
 * is in the title so the state is never a vibe. It stays small: §23 asks for
 * an honest chip, not a loud one.
 */
export function FreshnessChip({ freshness }: { freshness: Freshness }) {
  const tone = freshnessTone(freshness);
  return (
    <span className={`mt-fresh is-${tone}`} title={freshnessLine(freshness)}>
      <i aria-hidden="true">{tone === "current" ? "◆" : tone === "carried" ? "◇" : "△"}</i>
      {freshnessLabel(freshness)}
    </span>
  );
}

/**
 * The one provenance line, sitting under the quote it belongs to: what was
 * observed, when, and by whom. Replaces the separate `Observed` + `Provenance`
 * + per-section source notes of the previous pass. §22
 */
export function MetaLine({
  freshness, extra,
}: { freshness: Freshness; extra?: ReactNode }) {
  const s = freshness.source;
  return (
    <p className="mt-meta">
      <span>{freshnessLine(freshness)}</span>
      <i aria-hidden="true">·</i>
      {s.url.startsWith("http")
        ? <a href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.host}</a>
        : <span>{s.host}</span>}
      {extra ? <><i aria-hidden="true">·</i>{extra}</> : null}
    </p>
  );
}

/**
 * Collapsed by default, always. §10 §25 — nothing longer than a couple of
 * lines is allowed to sit in the default view, so every explanation the
 * previous pass printed as a full-width panel lives in one of these.
 */
export function Disclosure({
  label, children, id,
}: { label: string; children: ReactNode; id?: string }) {
  return (
    <details className="mt-disclose" id={id}>
      <summary>
        <span>{label}</span>
        <i aria-hidden="true">+</i>
      </summary>
      <div className="mt-disclose-body">{children}</div>
    </details>
  );
}

/* ── Unavailable · §37 · never a zero ─────────────────────────────────────── */
export function Unavailable({
  what, why, source,
}: { what: string; why: string; source?: Source }) {
  return (
    <div className="mt-unavailable">
      <strong>{what}</strong>
      <span>{why}</span>
      {source ? (
        <span className="mt-unavailable-src">
          المصدر: {source.host} · سيعود السعر عند نجاح القراءة التالية.
        </span>
      ) : null}
    </div>
  );
}

/* ── Partial failure · §38 · keep the usable parts ────────────────────────── */
export function PartialNotice({ children }: { children: ReactNode }) {
  return (
    <div className="mt-partial" role="status">
      <i aria-hidden="true">△</i>
      <span>{children}</span>
    </div>
  );
}

/* ── Loading · stable skeletons, never a spinner · §36 ────────────────────── */
export function SkeletonBlock({ lines = 3, tall }: { lines?: number; tall?: boolean }) {
  return (
    <div className={tall ? "mt-skel is-tall" : "mt-skel"} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => <span key={i} />)}
    </div>
  );
}

/**
 * Said once per page, inside a disclosure. The absence of a chart is the most
 * consequential fact about these pages, and the honest place for it is next to
 * the source — not as a banner competing with the quote.
 */
export function NoHistoryNote() {
  return (
    <p>
      لا يحتفظ المنتج بأي سلسلة زمنية لهذه الأسعار — كل قراءة تحلّ محل سابقتها،
      ولذلك لا يوجد رسم بياني تاريخي هنا. رسمُ سلسلة تبدأ من يوم تشغيل التخزين،
      ولا يستعيد ما لم يُسجَّل.
    </p>
  );
}
