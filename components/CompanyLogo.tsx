'use client'

import { useState } from 'react'

/**
 * The company chip used everywhere a company is listed: the mirrored ISC logo
 * when we have one, otherwise the ticker's opening letters on the company's
 * colour. Only 47 of the 104 listed companies have published a logo, so the
 * letter fallback is the normal case, not an error path — and a mirrored file
 * can still 404 after a sync, hence the onError swap.
 *
 * Chip geometry comes from `className` (a design class such as .logo-chip or
 * .market-company-logo) or from `style` on the surfaces that lay themselves out
 * inline. The image fills whatever box that gives it.
 */
export function CompanyLogo({
  sym,
  logo,
  color,
  letters = 1,
  className,
  style,
}: {
  sym: string
  logo?: string | null
  color?: string | null
  letters?: number
  className?: string
  style?: React.CSSProperties
}) {
  const [broken, setBroken] = useState(false)
  const show = Boolean(logo) && !broken
  // The chip's own colour belongs to the letter fallback; a real logo sits on
  // white, so drop any inline background once the image is showing.
  const { background, ...box } = style ?? {}

  return (
    <span
      className={[className, 'co-logo', show ? 'has-image' : null].filter(Boolean).join(' ')}
      style={show ? box : { background: color ?? background, ...box }}
      aria-hidden="true"
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="co-logo-img" src={logo!} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
      ) : (
        sym.slice(0, letters)
      )}
    </span>
  )
}
