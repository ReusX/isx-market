'use client'

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'

/**
 * Shared control and surface primitives.
 *
 * These are the components every migrated route builds from. The point is not
 * abstraction for its own sake — it is that the touch-target floor, the focus
 * ring, the disabled treatment and the loading behaviour get decided ONCE.
 * Before this, roughly half of the 895 inline styles in this repo were an
 * ad-hoc button or input, each solving those four problems slightly
 * differently, and most of them not solving the accessibility ones at all.
 *
 * All styling lives in styles/system.css against the `--mv-*` tokens. Nothing
 * here carries a colour.
 */

/* ── Buttons ─────────────────────────────────────────────────────────────── */

type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant
  compact?: boolean
  /** Shows a spinner WITHOUT resizing the control. */
  loading?: boolean
  className?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', compact, loading, className = '', children, disabled, type, ...rest },
  ref,
) {
  const classes = [
    'mv-btn',
    variant !== 'default' && `is-${variant}`,
    compact && 'is-compact',
    loading && 'is-loading',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      ref={ref}
      // Inside a <form>, an untyped button submits. That default has caused
      // more accidental submissions than any other single HTML behaviour.
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {children}
    </button>
  )
})

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  /** REQUIRED. An icon button with no label is invisible to a screen reader. */
  label: string
  compact?: boolean
  className?: string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, compact, className = '', children, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={['mv-icon-btn', compact && 'is-compact', className].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  )
})

/* ── Inputs ──────────────────────────────────────────────────────────────── */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  className?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', ...rest },
  ref,
) {
  return <input ref={ref} className={`mv-input ${className}`.trim()} {...rest} />
})

/**
 * A labelled field.
 *
 * `error` is announced, not merely coloured — `aria-invalid` plus a described
 * message, because "the box turned red" is not available to everyone.
 */
export function Field({
  label,
  hint,
  error,
  id,
  children,
}: {
  label: string
  hint?: string
  error?: string
  id: string
  children: ReactNode
}) {
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined
  return (
    <div className={`mv-field ${error ? 'is-invalid' : ''}`.trim()}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? <span id={hintId} className="mv-hint">{hint}</span> : null}
      {error ? <span id={errId} className="mv-error" role="alert">{error}</span> : null}
    </div>
  )
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  className?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className = '', children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={`mv-select ${className}`.trim()} {...rest}>
      {children}
    </select>
  )
})

/* ── Selection controls ──────────────────────────────────────────────────── */

/**
 * Segmented control — mutually exclusive options, all visible at once.
 *
 * Selection is carried by background, weight AND colour together, so it
 * survives greyscale and a colour-blind reader.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="mv-segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** A filter pill. `pressed` drives real `aria-pressed`, not a class alone. */
export function Chip({
  pressed,
  tone,
  onClick,
  children,
}: {
  pressed?: boolean
  tone?: 'up' | 'down'
  onClick?: () => void
  children: ReactNode
}) {
  const cls = ['mv-chip', tone && `is-${tone}`].filter(Boolean).join(' ')
  if (!onClick) return <span className={cls}>{children}</span>
  return (
    <button type="button" className={cls} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  )
}

/* ── Surfaces ────────────────────────────────────────────────────────────── */

export function Panel({
  flat,
  className = '',
  children,
  ...rest
}: { flat?: boolean; className?: string; children: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={['mv-panel', flat && 'is-flat', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </section>
  )
}

export function Divider() {
  return <hr className="mv-divider" />
}

export function Toolbar({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="mv-toolbar" role="toolbar" aria-label={label}>
      {children}
    </div>
  )
}

/** A labelled number. The label reads first for a screen reader, via CSS order. */
export function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mv-metric">
      <span className="ty-label">{label}</span>
      <span className="ty-metric">{children}</span>
    </div>
  )
}
