'use client'
import { useLocale } from '@/context/LocaleContext'

import {
  useCallback, useEffect, useRef, type ReactNode,
} from "react";

/**
 * Ported from the approved reference app's final system pass, unchanged.
 * Its CSS lives in styles/system.css, re-scoped from `.iq-dark` to
 * `[data-theme='dark']` — this app has one theme system and does not gain a
 * second.
 *
 * The overlay layer — one focus machine, three surfaces.
 *
 * `Dialog` (an interruption), `Sheet` (a mobile drawer) and the command
 * palette all need the same four behaviours, and every one of them is a real
 * defect when missing:
 *
 *   focus in       Move focus INTO the surface on open, or a keyboard user is
 *                  still on the page behind it and does not know a dialog
 *                  appeared.
 *   focus trap     Tab must cycle inside. Otherwise the next Tab lands on the
 *                  header behind the scrim, and the user is typing into a
 *                  page they cannot see.
 *   focus return   On close, focus goes back to whatever opened it. Without
 *                  this, closing a dialog dumps focus at the top of the
 *                  document and the reader loses their place entirely.
 *   Escape + scrim Both close. Escape is the one keyboard convention nobody
 *                  needs to be taught.
 *
 * Scroll is locked on the body while any overlay is open — on a phone,
 * scrolling the page under a sheet is how a sheet stops feeling like a
 * surface and starts feeling like a bug.
 *
 * ⚠ NO backdrop-filter anywhere in this file. The main plan records the iOS
 * WebKit compositing bug from two angles: a full-viewport fixed element with
 * a backdrop-filter composites ABOVE later-painted siblings regardless of
 * z-index, which blurred the drawer and swallowed taps. Scrims stay flat.
 */

const FOCUSABLE = [
  "a[href]", "button:not([disabled])", "input:not([disabled])",
  "select:not([disabled])", "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useOverlay(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const restore = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restore.current = document.activeElement as HTMLElement | null;

    const node = ref.current;
    if (node) {
      const first = node.querySelector<HTMLElement>("[data-autofocus]")
        ?? node.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? node).focus();
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      restore.current?.focus?.();
    };
  }, [open, onClose]);

  return ref;
}

/**
 * A dialog · for the few actions that genuinely deserve to interrupt.
 *
 * §11 lists them and the list is short: delete an account, remove data that
 * cannot be recovered, discard unsaved work. Ordinary navigation never gets a
 * modal.
 *
 * §12 governs the destructive variant: the title must name the THING, not ask
 * «هل أنت متأكد؟». «حذف مركز TASC من المحفظة؟» tells the reader what they are
 * about to lose; the generic question makes them guess, and a reader who has
 * to guess clicks the confirm button to find out.
 */
export function Dialog({
  open, onClose, title, description, tone = "normal", confirmLabel,
  cancelLabel, onConfirm, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  tone?: "normal" | "destructive";
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  const { t } = useLocale()
  const ref = useOverlay(open, onClose);
  if (!open) return null;

  return (
    <div className="ov-scrim" onMouseDown={onClose}>
      <div
        ref={ref}
        className={`ov-dialog is-${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ov-title"
        aria-describedby={description ? "ov-desc" : undefined}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="ov-title">{title}</h2>
        {description ? <p id="ov-desc">{description}</p> : null}
        {children}
        <div className="ov-actions">
          {/* Cancel takes focus first, and it is the visually easy one (§12).
              On a destructive dialog the safe path should be the one your
              hands find without looking. */}
          <button type="button" className="ov-cancel" onClick={onClose} data-autofocus>
            {cancelLabel ?? t.system.overlay.cancel}
          </button>
          <button
            type="button"
            className={tone === "destructive" ? "ov-confirm is-danger" : "ov-confirm"}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * A sheet · the one drawer language, per §13.
 *
 * Filters, company search, the article contents, mobile navigation and chart
 * controls were each drifting toward their own drawer. They are the same
 * object: a panel that rises from the edge, holds a title and a close, traps
 * focus, and dismisses on scrim or Escape. `side` is the only thing that
 * varies — `block-end` for a bottom sheet, `inline-start` for navigation,
 * which in RTL means it slides from the right, where the menu button is.
 */
export function Sheet({
  open, onClose, title, side = "block-end", children, footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "block-end" | "inline-start";
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useLocale()
  const ref = useOverlay(open, onClose);
  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  if (!open) return null;

  return (
    <div className="ov-scrim is-sheet" onMouseDown={onClose}>
      <div
        ref={ref}
        className={`ov-sheet is-${side === "block-end" ? "bottom" : "side"}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onMouseDown={stop}
      >
        <div className="ov-sheet-head">
          {/* The grabber is decoration on a bottom sheet and meaningless on a
              side one, so it only appears where it means something. */}
          {side === "block-end" ? <i className="ov-grab" aria-hidden="true" /> : null}
          <strong>{title}</strong>
          <button type="button" className="ov-sheet-close" onClick={onClose} aria-label={t.system.overlay.close}>✕</button>
        </div>
        <div className="ov-sheet-body">{children}</div>
        {footer ? <div className="ov-sheet-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
