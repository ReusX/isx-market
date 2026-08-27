import { ImageResponse } from 'next/og'
import { STAR_PATH } from '@/components/brand/StarMark'

export const runtime = 'edge'
export const alt = 'IQWealth · Iraq Stock Exchange Live Prices & Analysis'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0B0E14',
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '64px 80px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,107,255,0.18) 0%, transparent 70%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -150,
          left: -100,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,107,255,0.10) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Top row · domain badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          width: '100%',
          justifyContent: 'space-between',
        }}>
          {/* Logo mark */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}>
            {/* Star of Ishtar · drawn straight from the shared path so the
                social card can never drift from the favicon and the app. */}
            <svg width="48" height="48" viewBox="0 0 96 96">
              <path fillRule="evenodd" fill="#ffffff" d={STAR_PATH} />
            </svg>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
              IQWealth
            </span>
          </div>

          {/* Domain */}
          <div style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.4)',
            fontWeight: 500,
            letterSpacing: '0.04em',
          }}>
            iraqsm.com
          </div>
        </div>

        {/* Main headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/*
            Two element children in an explicit flex column, NOT text + <br/>.

            Satori (which renders this image) refuses any <div> with more than
            one child unless it declares `display`. "Iraq Stock", <br/> and
            "Exchange" are three children, so this threw at render time and the
            whole route returned nothing — every share card on the site was a
            broken image, silently, because nothing fetches an OG image during
            a normal page load or a build. Only a crawler or a link unfurler
            ever requests it.
          */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 68,
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}>
            <div>Iraq Stock</div>
            <div>Exchange</div>
          </div>
          <div style={{
            fontSize: 26,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.01em',
          }}>
            Live prices · Charts · Analysis · RSISX Index
          </div>
        </div>

        {/* Bottom stats row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          width: '100%',
        }}>
          {[
            { value: '104', label: 'Listed Companies' },
            { value: 'RSISX', label: 'Rabee Index' },
            { value: 'Live', label: 'Real-time Data' },
          ].map((stat, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              flex: 1,
              paddingRight: 40,
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.12)' : 'none',
              paddingLeft: i > 0 ? 40 : 0,
            }}>
              <div style={{
                fontSize: 36,
                fontWeight: 900,
                color: '#F5C84B',
                lineHeight: 1,
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: 15,
                color: 'rgba(255,255,255,0.45)',
                fontWeight: 500,
              }}>
                {stat.label}
              </div>
            </div>
          ))}

          {/* Accent bar chart decoration */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 5,
            height: 64,
            paddingLeft: 40,
          }}>
            {[40, 55, 35, 70, 50, 80, 60, 75, 65, 90].map((h, i) => (
              <div key={i} style={{
                width: 10,
                height: h * 0.64,
                borderRadius: 3,
                background: i % 3 === 1
                  ? 'rgba(239,68,68,0.6)'
                  : 'rgba(34,197,94,0.6)',
              }} />
            ))}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
