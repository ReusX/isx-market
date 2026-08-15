'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef,
  useState, type ReactNode,
} from "react";

/**
 * Ported from the approved reference app's final system pass, unchanged.
 * Its CSS lives in styles/system.css, re-scoped from `.iq-dark` to
 * `[data-theme='dark']` — this app has one theme system and does not gain a
 * second.
 *
 * The toast system — one, for the whole product.
 *
 * ── What it is for, and what it is NOT for ────────────────────────────────
 * Lightweight confirmation of something the user just did and can already
 * see the result of: saved, copied, added, removed, export finished, action
 * failed. §8 draws the line and it is worth keeping sharp — a toast must
 * never carry a decision. Anything the user has to acknowledge, or could lose
 * data by missing, is a dialog.
 *
 * ── The behaviours that make it usable rather than decorative ─────────────
 * Every one of these exists because its absence is a real bug:
 *
 *   dedupe        Clicking «أضف» four times must not stack four identical
 *                 toasts (§10). A repeat of a live message restarts its timer
 *                 and bumps a count instead of queueing.
 *   pause         The timer stops on hover and on keyboard focus. A toast
 *                 that expires while you are reaching for its dismiss button
 *                 is a target that runs away.
 *   cap           Four at once, oldest dropped. An unbounded stack can cover
 *                 the content it is reporting on.
 *   aria-live     `polite` for everything except `error`, which is
 *                 `assertive` — a failure is the one case worth interrupting.
 *                 The region is always in the DOM, because a live region
 *                 mounted at the same moment as its message is not announced.
 *   duration      Errors sit twice as long. They usually carry a next step,
 *                 and Arabic takes longer to read than the English these
 *                 defaults are normally tuned against.
 */

export type ToastTone = "success" | "error" | "warning" | "info";

export type Toast = {
  id: number;
  tone: ToastTone;
  text: string;
  /** One optional action. Never destructive — that belongs in a dialog. */
  action?: { label: string; onClick: () => void };
  count: number;
};

type Ctx = { push: (t: Omit<Toast, "id" | "count">) => void };
const ToastCtx = createContext<Ctx | null>(null);

const CAP = 4;
const MS: Record<ToastTone, number> = {
  success: 3200, info: 3600, warning: 5000, error: 7000,
};

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const [paused, setPaused] = useState(false);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((t: Omit<Toast, "id" | "count">) => {
    setItems((list) => {
      /* Dedupe on tone + text. The repeat bumps the count and, because the
         object identity changes, restarts the timer below. */
      const same = list.find((x) => x.tone === t.tone && x.text === t.text);
      if (same) {
        return list.map((x) =>
          x.id === same.id ? { ...x, id: ++seq.current, count: x.count + 1 } : x);
      }
      const next = [...list, { ...t, id: ++seq.current, count: 1 }];
      return next.length > CAP ? next.slice(next.length - CAP) : next;
    });
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {/* Always mounted. A live region created at the same tick as its first
          message is frequently not announced at all. */}
      <div className="ty-live" role="status" aria-live="polite" aria-atomic="false">
        {items.filter((t) => t.tone !== "error").map((t) => <span key={t.id}>{t.text}</span>)}
      </div>
      <div className="ty-live" role="alert" aria-live="assertive" aria-atomic="false">
        {items.filter((t) => t.tone === "error").map((t) => <span key={t.id}>{t.text}</span>)}
      </div>

      <div
        className="ty-stack"
        /* The stack itself is decorative scaffolding; each toast carries its
           own semantics, and the text is announced by the regions above. */
        aria-hidden="true"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        {items.map((t) => (
          <ToastView key={t.id} t={t} paused={paused} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastView({
  t, paused, onDismiss,
}: { t: Toast; paused: boolean; onDismiss: () => void }) {
  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(onDismiss, MS[t.tone]);
    return () => window.clearTimeout(id);
    /* `t.id` changes when a duplicate arrives, which is exactly what restarts
       the countdown for a repeated message. */
  }, [t.id, t.tone, paused, onDismiss]);

  return (
    <div className={`ty-toast is-${t.tone}`}>
      {/* Tone is carried by a mark AND a rule, never by colour alone — the
          accessibility pass forbids colour as the only state signal. */}
      <i className="ty-mark" aria-hidden="true">
        {t.tone === "success" ? "✓" : t.tone === "error" ? "!" : t.tone === "warning" ? "△" : "i"}
      </i>
      <span className="ty-text">{t.text}</span>
      {t.count > 1 ? <bdi className="ty-count">×{t.count}</bdi> : null}
      {t.action ? (
        <button type="button" className="ty-action" onClick={() => { t.action!.onClick(); onDismiss(); }}>
          {t.action.label}
        </button>
      ) : null}
      <button type="button" className="ty-close" onClick={onDismiss} aria-label="إغلاق">✕</button>
    </div>
  );
}
