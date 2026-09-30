import { useId, type ReactNode } from 'react'
import type { ShopId } from '@/lib/moneyStreetCopy'

/**
 * The shopfronts of «شارع المال», drawn in code so they follow the theme
 * (every colour is a --ms-* token from styles/money-street.css) and can
 * carry live numbers: the changer's rate board and the exchange's ticker
 * are real prices, not pictures of prices.
 *
 * One frame (wall, sign, awning, window, door) and five fittings. The sign
 * text comes from the copy file; nothing here is written in a language.
 */
type Live = { buy?: string; sell?: string; ticker?: string }

const VB = '0 0 320 260'

function Awning({ y = 96 }: { y?: number }) {
  const n = 8, w = 280 / n
  return (
    <g className="ms-awning">
      <rect x="20" y={y} width="280" height="20" fill="var(--ms-awn)" />
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={20 + i * w} y={y} width={w / 2} height="20" fill="var(--ms-awn-2)" />
      ))}
      {/* the scalloped hem */}
      {Array.from({ length: n * 2 }, (_, i) => (
        <path key={`s${i}`} d={`M${20 + i * (w / 2)} ${y + 20} q${w / 4} 12 ${w / 2} 0`} fill={i % 2 ? 'var(--ms-awn-2)' : 'var(--ms-awn)'} />
      ))}
    </g>
  )
}

function Frame({ sign, children, awning = true, door = true }: { sign: string; children?: ReactNode; awning?: boolean; door?: boolean }) {
  return (
    <>
      <rect x="10" y="244" width="300" height="10" rx="3" fill="var(--ms-kerb)" />
      <rect x="20" y="30" width="280" height="216" rx="4" fill="var(--ms-wall)" />
      <rect x="20" y="30" width="280" height="10" fill="var(--ms-wall-2)" />
      {/* brick courses, a few, for texture */}
      {[60, 72, 84].map((y, i) => (
        <g key={y} opacity=".35">
          {Array.from({ length: 9 }, (_, j) => (
            <rect key={j} x={24 + j * 31 + (i % 2) * 15} y={y} width="26" height="8" rx="1.5" fill="var(--ms-wall-2)" />
          ))}
        </g>
      ))}
      <rect x="64" y="44" width="192" height="40" rx="6" fill="var(--ms-sign)" />
      <text x="160" y="71" textAnchor="middle" className="ms-sign-text" fill="var(--ms-sign-ink)">{sign}</text>
      {awning ? <Awning /> : null}
      <rect x="36" y="130" width="160" height="104" rx="4" fill="var(--ms-frame)" />
      <rect x="42" y="136" width="148" height="92" rx="2" fill="var(--ms-glass)" />
      {children}
      {door ? (
        <g>
          <rect x="210" y="130" width="74" height="114" rx="4" fill="var(--ms-frame)" />
          <rect x="216" y="136" width="62" height="108" rx="2" fill="var(--ms-door)" />
          <rect x="222" y="144" width="50" height="44" rx="2" fill="var(--ms-glass)" opacity=".7" />
          <circle cx="268" cy="200" r="3" fill="var(--ms-metal)" />
        </g>
      ) : null}
    </>
  )
}

function House({ sign }: { sign: string }) {
  return (
    <>
      <rect x="10" y="244" width="300" height="10" rx="3" fill="var(--ms-kerb)" />
      <rect x="30" y="40" width="260" height="206" rx="4" fill="var(--ms-wall)" />
      <rect x="30" y="40" width="260" height="10" fill="var(--ms-wall-2)" />
      {/* the shanasheel: a wooden oriel window over the street */}
      <g className="ms-shanasheel">
        <rect x="70" y="62" width="180" height="92" rx="4" fill="var(--ms-wood)" />
        <rect x="64" y="150" width="192" height="10" rx="2" fill="var(--ms-wood-2)" />
        <rect x="64" y="56" width="192" height="10" rx="2" fill="var(--ms-wood-2)" />
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i}>
            <rect x={80 + i * 28} y="72" width="20" height="70" rx="2" fill="var(--ms-glass)" opacity=".85" />
            {[82, 96, 110, 124].map((y) => (
              <path key={y} d={`M${80 + i * 28} ${y} l20 8 M${100 + i * 28} ${y} l-20 8`} stroke="var(--ms-wood)" strokeWidth="1.6" />
            ))}
          </g>
        ))}
      </g>
      {/* a blue house-number plaque, as on Baghdad's houses */}
      <rect x="56" y="192" width="62" height="26" rx="4" fill="var(--ms-plate)" stroke="var(--ms-plate-ink)" strokeWidth="1.5" />
      <text x="87" y="210" textAnchor="middle" className="ms-sign-text is-plaque" fill="var(--ms-plate-ink)">{sign}</text>
      {/* arched door and a pot of basil */}
      <path d="M130 244 v-36 a30 30 0 0 1 60 0 v36 z" fill="var(--ms-door)" />
      <circle cx="176" cy="226" r="2.6" fill="var(--ms-metal)" />
      <rect x="220" y="222" width="26" height="22" rx="3" fill="var(--ms-brick)" />
      <circle cx="226" cy="214" r="9" fill="var(--ms-leaf)" /><circle cx="240" cy="212" r="10" fill="var(--ms-leaf)" /><circle cx="233" cy="204" r="8" fill="var(--ms-leaf)" />
    </>
  )
}

function Sarraf({ sign, live }: { sign: string; live?: Live }) {
  return (
    <Frame sign={sign}>
      {/* the rate board: live buy and sell */}
      <rect x="54" y="144" width="124" height="54" rx="4" fill="var(--ms-board)" />
      <text x="162" y="164" textAnchor="start" className="ms-board-k" fill="var(--ms-board-dim)">$</text>
      <text x="116" y="166" textAnchor="middle" className="ms-board-v" fill="var(--ms-led-up)">{live?.buy ?? '—'}</text>
      <text x="116" y="189" textAnchor="middle" className="ms-board-v" fill="var(--ms-led-down)">{live?.sell ?? '—'}</text>
      {/* bundles of notes */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={58 + i * 40} y={206 - i * 3} width="34" height="16" rx="2" fill="var(--ms-note)" />
          <rect x={70 + i * 40} y={206 - i * 3} width="8" height="16" fill="var(--ms-note-band)" />
        </g>
      ))}
    </Frame>
  )
}

function Goldsmith({ sign }: { sign: string }) {
  return (
    <Frame sign={sign}>
      {/* bangles */}
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={78 + i * 22} cy={168} rx="14" ry="16" fill="none" stroke="var(--ms-gold)" strokeWidth="4" className="ms-shine" style={{ animationDelay: `${i * 0.4}s` }} />
      ))}
      {/* bars */}
      {[0, 1].map((i) => (
        <path key={i} d={`M${58 + i * 58} 218 l10 -14 h36 l10 14 z`} fill="var(--ms-gold)" stroke="var(--ms-gold-deep)" strokeWidth="1.5" />
      ))}
      <path d="M87 204 l10 -14 h36 l10 14 z" fill="var(--ms-gold-lite)" stroke="var(--ms-gold-deep)" strokeWidth="1.5" />
    </Frame>
  )
}

function Bank({ sign }: { sign: string }) {
  return (
    <>
      <rect x="10" y="244" width="300" height="10" rx="3" fill="var(--ms-kerb)" />
      <path d="M20 96 L160 30 L300 96 Z" fill="var(--ms-stone-2)" />
      <rect x="20" y="96" width="280" height="14" fill="var(--ms-stone-2)" />
      <rect x="92" y="60" width="136" height="28" rx="4" fill="var(--ms-sign)" />
      <text x="160" y="80" textAnchor="middle" className="ms-sign-text is-small" fill="var(--ms-sign-ink)">{sign}</text>
      <rect x="20" y="110" width="280" height="134" fill="var(--ms-stone)" />
      {[40, 90, 196, 246].map((x) => (
        <g key={x}>
          <rect x={x} y="116" width="30" height="120" fill="var(--ms-stone-2)" />
          {[0, 1, 2].map((j) => <rect key={j} x={x + 5 + j * 8} y="120" width="3" height="112" fill="var(--ms-stone)" opacity=".7" />)}
        </g>
      ))}
      <rect x="132" y="150" width="56" height="94" rx="3" fill="var(--ms-door)" />
      <rect x="140" y="160" width="40" height="30" rx="2" fill="var(--ms-glass)" opacity=".7" />
      <rect x="20" y="236" width="280" height="8" fill="var(--ms-stone-2)" />
    </>
  )
}

function Bourse({ sign, live }: { sign: string; live?: Live }) {
  const clip = `ms-tick-${useId().replace(/:/g, '')}`
  return (
    <Frame sign={sign} awning={false}>
      {/* the ticker: a live line scrolling across an LED strip */}
      <rect x="20" y="96" width="280" height="24" fill="var(--ms-board)" />
      <clipPath id={clip}><rect x="24" y="96" width="272" height="24" /></clipPath>
      <g clipPath={`url(#${clip})`}>
        <text x="300" y="113" className="ms-ticker" fill="var(--ms-led-up)">{live?.ticker ?? ''}</text>
      </g>
      {/* a chart on the screen in the window */}
      <path d="M50 214 L78 196 L98 204 L122 176 L142 184 L168 156 L184 162" fill="none" stroke="var(--ms-led-up)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={54 + i * 26} y={222 - (i % 3) * 4} width="12" height={6 + (i % 3) * 4} fill="var(--ms-glass-2)" />
      ))}
    </Frame>
  )
}

export function Shopfront({ shop, sign, live, className }: { shop: ShopId; sign: string; live?: Live; className?: string }) {
  return (
    <svg viewBox={VB} className={`ms-art is-${shop} ${className ?? ''}`} role="img" aria-label={sign}>
      {shop === 'house' ? <House sign={sign} /> : shop === 'sarraf' ? <Sarraf sign={sign} live={live} />
        : shop === 'gold' ? <Goldsmith sign={sign} /> : shop === 'bank' ? <Bank sign={sign} /> : <Bourse sign={sign} live={live} />}
    </svg>
  )
}

/** A street lamp crowned with the brand star, marking each stop on the pavement. */
export function Lamp() {
  return (
    <svg viewBox="0 0 40 120" className="ms-lamp" aria-hidden="true">
      <rect x="18" y="30" width="4" height="86" rx="2" fill="var(--ms-metal)" />
      <rect x="10" y="112" width="20" height="6" rx="2" fill="var(--ms-metal)" />
      <circle cx="20" cy="20" r="14" className="ms-glow" fill="var(--ms-lamp-glow)" />
      <path d="M20 8 L23 17 L32 20 L23 23 L20 32 L17 23 L8 20 L17 17 Z" fill="var(--ms-lamp)" />
    </svg>
  )
}
