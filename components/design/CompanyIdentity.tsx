'use client'

import { useState } from 'react'

export function CompanyIdentity({
  symbol,
  name,
  logo,
  color,
}: {
  symbol: string
  name: string
  logo?: string
  color?: string
}) {
  // Several ISC logo URLs 404 or expire — fall back to the initial chip.
  const [broken, setBroken] = useState(false)
  const showImage = Boolean(logo) && !broken

  return (
    <span className="market-company-inline">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="market-company-logo has-image"
          src={logo}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="market-company-logo" style={color ? { background: color } : undefined} aria-hidden="true">
          {symbol.slice(0, 1)}
        </span>
      )}
      <span className="market-company-identity">
        <strong>{name}</strong>
        <bdi>{symbol}</bdi>
      </span>
    </span>
  )
}
