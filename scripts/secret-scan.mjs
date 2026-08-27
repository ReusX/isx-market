/**
 * Repository secret scan.
 *
 * Written because a real WordPress application password sat in
 * scripts/news_pipeline.py for months and the ad-hoc grep used during the
 * pre-deploy gate did not see it: that grep wanted 25+ characters with no
 * spaces, and a WP application password is six four-character groups SEPARATED
 * by spaces. The shape that hid it is the first rule below.
 *
 *   node scripts/secret-scan.mjs              scan tracked files
 *   node scripts/secret-scan.mjs --self-test  check the detectors themselves
 *
 * The rule for every pattern here: match the SHAPE of a real credential, and
 * let the placeholder filter clear the documentation. A scanner that cries wolf
 * on `your_password_here` gets switched off, which is how this one got missed.
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const RULES = [
  {
    id: 'wp-application-password',
    // WordPress prints exactly six groups of four, space separated.
    re: /\b[A-Za-z0-9]{4}(?: [A-Za-z0-9]{4}){5}\b/g,
    note: 'WordPress application password',
  },
  { id: 'anthropic-key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g, note: 'Anthropic API key' },
  { id: 'openai-key', re: /\bsk-[A-Za-z0-9]{32,}/g, note: 'OpenAI-style API key' },
  { id: 'github-token', re: /\b(?:ghp|gho|ghs|ghr)_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{40,}/g, note: 'GitHub token' },
  { id: 'supabase-pat', re: /\bsbp_[A-Za-z0-9]{30,}/g, note: 'Supabase personal access token' },
  { id: 'aws-key-id', re: /\bAKIA[0-9A-Z]{16}\b/g, note: 'AWS access key id' },
  { id: 'jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, note: 'signed JWT' },
  { id: 'google-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g, note: 'Google API key' },
  {
    id: 'assigned-literal',
    // PASSWORD = "..." / SECRET: '...' / TOKEN="..." with a long opaque value.
    re: /\b(?:password|passwd|secret|token|api[_-]?key)\b["'\s]*[:=]\s*["']([^"'\s]{16,})["']/gi,
    note: 'credential assigned as a literal',
  },
]

/** Documentation, not a credential. Keep this generous — a noisy gate is an ignored gate. */
const PLACEHOLDER = /^(?:x+|y+|\.+|-+|_+|0+|\*+)$|your[_-]|placeholder|example|redacted|changeme|dummy|\.\.\.|<[^>]+>|\$\{|process\.env|os\.environ|secrets\./i

function isPlaceholder(hit) {
  const s = hit.trim()
  if (PLACEHOLDER.test(s)) return true
  // "xxxx xxxx xxxx" and friends: every group identical, or one repeated char.
  const groups = s.split(/\s+/)
  if (groups.length > 1 && new Set(groups).size === 1) return true
  if (/^(.)\1+$/.test(s.replace(/\s/g, ''))) return true
  return false
}

/**
 * A line may opt out with `secret-scan:allow`. This exists for exactly one
 * legitimate case — a synthetic fixture that has to LOOK like a credential so
 * the detector can be tested against it. Use it nowhere else: the pragma is
 * greppable, so a reviewer can audit every exemption in one command.
 */
const ALLOW_PRAGMA = /secret-scan:allow/

function scanText(text) {
  const found = []
  const lines = text.split('\n')
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.re)) {
      const hit = m[1] ?? m[0]
      if (isPlaceholder(hit)) continue
      const lineNo = text.slice(0, m.index).split('\n').length
      if (ALLOW_PRAGMA.test(lines[lineNo - 1] ?? '')) continue
      found.push({ rule: rule.id, note: rule.note, hit, line: lineNo })
    }
  }
  return found
}

// ── Self-test · the fixture that proves the gate would have caught it ──────
if (process.argv.includes('--self-test')) {
  const cases = [
    ['export WP_APP_PASSWORD="Xm8D QRNQ 8g01 WDJ7 UfbQ 6cw5"', true, 'the credential that leaked'], // secret-scan:allow — revoked fixture
    ['export WP_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx"', false, 'placeholder password'],
    ['export WP_USERNAME=your_wp_admin_username', false, 'placeholder username'],
    ['export ANTHROPIC_API_KEY=sk-ant-...', false, 'elided key'],
    ['ANTHROPIC_API_KEY=sk-ant-api03-9Fk2LmQ7zXvB4nR8tYwE1aScD', true, 'real-shaped Anthropic key'], // secret-scan:allow — synthetic
    ['const k = process.env.SUPABASE_SERVICE_ROLE_KEY', false, 'env reference'],
    ['password: "hunter2"', false, 'too short to be opaque'],
    ['api_key = "a83Jf0aksLd93jdKa0sldkfJ22x"', true, 'assigned opaque literal'], // secret-scan:allow — synthetic
    ['SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}', false, 'GitHub secret reference'],
  ]
  let failed = 0
  for (const [text, shouldFlag, label] of cases) {
    const got = scanText(text).length > 0
    if (got !== shouldFlag) {
      console.error(`  x ${label}: expected ${shouldFlag ? 'FLAG' : 'clean'}, got ${got ? 'FLAG' : 'clean'}`)
      failed++
    }
  }
  if (failed) { console.error(`✗ secret-scan self-test: ${failed}/${cases.length} failed`); process.exit(1) }
  console.log(`✓ secret-scan self-test: ${cases.length} fixtures, including the WP application password that leaked`)
  process.exit(0)
}

// ── Scan tracked source ────────────────────────────────────────────────────
const SKIP = /^(?:scripts\/\.venv\/|node_modules\/|\.next|package-lock\.json$)|\.(?:png|jpe?g|gif|webp|svg|woff2?|ico|pdf|xlsx?|zip)$/
const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(f => f && !SKIP.test(f))

const problems = []
for (const f of files) {
  let text
  try { text = fs.readFileSync(f, 'utf8') } catch { continue }
  if (text.includes('\0')) continue // binary
  for (const hit of scanText(text)) {
    problems.push(`${f}:${hit.line}  ${hit.note} (${hit.rule})`)
  }
}

if (problems.length) {
  console.error(`✗ secret scan: ${problems.length} possible credential(s) in tracked source`)
  problems.forEach(p => console.error('  ·', p))
  console.error('  If a hit is documentation, make it an obvious placeholder rather than widening the rule.')
  process.exit(1)
}
console.log(`✓ secret scan: ${files.length} tracked files, no credential-shaped literals`)
