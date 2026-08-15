import type { Config } from 'tailwindcss'

/*
 * Tailwind's job here is small and deliberate.
 *
 * The design lives in `styles/` as semantic classes, not utilities — the RTL
 * story depends on logical properties that utilities express badly, and the
 * codebase has ~56 utility classes total against ~380 design classes. So this
 * config carries preflight plus the handful of things actually referenced, and
 * nothing else.
 *
 * What was removed, and why it was safe:
 *   · the `colors` block — a full palette (brand #4F6BFF, bg #0B0E14, surf…)
 *     left over from before the design-system port. It contradicted the tokens
 *     in styles/tokens.css on every single value, and grepping the whole repo
 *     for `bg-surf2`, `text-ink3`, `border-line` and every other utility it
 *     could produce returns ZERO hits. It was dead configuration that made the
 *     real palette ambiguous to anyone reading the repo.
 *   · `borderRadius` 2xl/3xl and `fontFamily.sans`/`arabic` — likewise zero
 *     usages. Radius now comes from --r-* tokens.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
  ],

  /*
   * The app switches themes with a `data-theme` attribute on <html> (set
   * server-side, restored pre-paint by the inline script in the root layout).
   * `darkMode: 'class'` looked for a `.dark` class that this codebase has never
   * put anywhere, so every `dark:` variant Tailwind generated was unreachable.
   *
   * There are currently 0 `dark:` variants in use, so this fixes nothing today
   * — it stops the next person who writes one from losing an hour to it.
   */
  darkMode: ['selector', '[data-theme="dark"]'],

  theme: {
    extend: {
      fontFamily: {
        /*
         * Not referenced by any `font-sans` class — this entry exists because
         * Tailwind's preflight emits `html { font-family: theme(fontFamily.sans) }`.
         * It used to point at `var(--font-en)`, i.e. Inter, which this site does
         * not load anywhere; html was silently falling back to a system stack
         * while body used var(--font-body). Pointing it at the font body
         * actually uses means the two can never disagree.
         */
        sans: ['var(--font-body)', 'Arial', 'sans-serif'],

        /*
         * 57 uses across 22 files — the one genuinely load-bearing entry.
         *
         * Points at --font-numeric directly rather than at the legacy --font-mono
         * alias. Identical value (the bridge in styles/legacy.css maps one to the
         * other), but it removes a bridge consumer, and the bridge cannot be
         * deleted until its consumer count reaches zero.
         */
        mono: ['var(--font-numeric)', 'ui-monospace', 'monospace'],
      },
    },
  },

  plugins: [],
}

export default config
