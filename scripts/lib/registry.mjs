/**
 * The route registry, read once for every gate that needs it.
 *
 * This exists because the gates had started keeping their OWN copies of the
 * route classes. `scripts/i18n-seo.mjs` hardcoded `/companies` as Arabic-only;
 * when `/companies` became a real mirrored pair the gate went red on a page
 * that was correct, and had the change gone the other way it would have gone
 * GREEN on a page that was broken. A second list is a list that drifts.
 *
 * `lib/i18n/routes.ts` is the single source. The gates are .mjs and cannot
 * import TypeScript, so it is parsed — carefully, and with a self-check,
 * because a regex over source is exactly the kind of reader that can fail
 * silently and report success.
 */
import fs from 'node:fs'

export function readRegistry(file = 'lib/i18n/routes.ts') {
  const src = fs.readFileSync(file, 'utf8')
  const byClass = { mirror: [], chrome: [], private: [], 'ar-only': [] }

  // Single-line entries: { pattern: '/market', cls: 'mirror' },
  for (const m of src.matchAll(/pattern:\s*'([^']+)',\s*cls:\s*'([a-z-]+)'/g)) {
    byClass[m[2]]?.push(m[1])
  }
  // Multi-line entries, where `why` follows on later lines.
  for (const m of src.matchAll(/pattern:\s*'([^']+)',\s*\n\s*cls:\s*'([a-z-]+)'/g)) {
    if (!byClass[m[2]]?.includes(m[1])) byClass[m[2]]?.push(m[1])
  }
  /* The bulk `ar-only` spread. Its closing bracket must be anchored to the
     `.map` that follows: a naive `[^\]]+` stops dead on `/analysis/[sym]`. */
  for (const m of src.matchAll(/\.\.\.\(\[([\s\S]*?)\]\s*\n\s*\.map/g)) {
    for (const r of m[1].matchAll(/'([^']+)'/g)) {
      if (!byClass['ar-only'].includes(r[1])) byClass['ar-only'].push(r[1])
    }
  }

  /* Self-check. These three are structural: the site root is mirrored, the
     portfolio is private, and /banks is a retired compatibility route. If any
     is missing the parse is wrong, and a blind gate is worse than no gate. */
  const problems = []
  if (!byClass.mirror.includes('/')) problems.push("registry parse: '/' should be mirror")
  if (!byClass.private.includes('/portfolio')) problems.push("registry parse: '/portfolio' should be private")
  if (!byClass['ar-only'].includes('/banks')) problems.push("registry parse: '/banks' should be ar-only")
  if (problems.length) {
    console.error('✗ cannot read lib/i18n/routes.ts')
    problems.forEach(p => console.error('  ·', p))
    process.exit(1)
  }

  return {
    mirror: byClass.mirror,
    chrome: byClass.chrome,
    private: byClass.private,
    arOnly: byClass['ar-only'],
    /** Routes that must resolve, and reciprocate hreflang, in BOTH languages. */
    paired: [...byClass.mirror, ...byClass.chrome],
  }
}
