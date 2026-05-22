import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand
        brand:      '#4F6BFF',
        'brand-d':  '#3A4FD6',
        'brand-s':  'rgba(79,107,255,0.14)',
        // Finance signals
        up:         '#22C55E',
        dn:         '#EF4444',
        // Rewards
        gold:       '#F5C84B',
        'gold-d':   '#D4A21B',
        purple:     '#A855F7',
        // Surfaces (dark)
        bg:         '#0B0E14',
        surf:       '#11151E',
        surf2:      '#161B27',
        surf3:      '#1C2230',
        // Ink
        ink:        'rgba(255,255,255,1)',
        ink2:       'rgba(255,255,255,0.72)',
        ink3:       'rgba(255,255,255,0.50)',
        ink4:       'rgba(255,255,255,0.32)',
        // Border
        line:       'rgba(255,255,255,0.08)',
        line2:      'rgba(255,255,255,0.14)',
      },
      fontFamily: {
        mono:    ['var(--font-mono)', 'ui-monospace', 'monospace'],
        sans:    ['var(--font-en)', '-apple-system', 'sans-serif'],
        arabic:  ['var(--font-ar)', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}

export default config
