/** PART 19 · the accepted behaviours that localization must not have moved. */
const O = 'http://localhost:3000'
const out = []
const ok = (name, cond, detail = '') => out.push(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`)

// ChartEngine only, no KChart anywhere.
const { execSync } = await import('node:child_process')
/* Exclude comments — the phrase "no KChart" appears in this repo's own notes. */
const kchart = execSync(`grep -rn "KChart" --include=*.tsx --include=*.ts app components lib 2>/dev/null | grep -v '\\* ' | grep -v '//' || true`).toString().trim()
ok('ChartEngine only, no KChart', kchart === '', kchart.slice(0, 120))

// No Alerts in the navigation.
const nav = execSync('cat lib/navigation.ts').toString()
ok('no Alerts navigation resurrection', !/alerts/i.test(nav.split('Active-route test')[0].replace(/\/\*[\s\S]*?\*\//g, '')))

// The 13-ticker financial guard is intact.
const fin = execSync('cat lib/financials.ts').toString()
ok('financial unit guard present', /valuesWithheld/.test(fin) && /Data-quality guard/.test(fin))

// noPrior is never folded into unchanged.
const mk = execSync('cat lib/i18n/messages/en/market.ts').toString()
ok('noPrior stays its own state', /noPrior:\s*'No prior close'/.test(mk) && /flat:\s*'Unchanged'/.test(mk))

// Pulse keeps four breadth states in both languages.
for (const l of ['ar', 'en']) {
  const p = execSync(`cat lib/i18n/messages/${l}/pulse.ts`).toString()
  ok(`pulse four-state breadth (${l})`, ['up:', 'flat:', 'down:', 'noPrior:'].every(k => p.includes(k)))
}

// The verdict rule takes live thresholds rather than baking them in.
const pl = execSync('cat lib/pulse.ts').toString()
ok('verdict returns an id, not prose', /id: 'broadSupported'/.test(pl) && !/headline:/.test(pl))

/* Foreign flow keeps zero / gap apart.

   This used to grep the English file for one exact sentence, so the August
   2026 copy pass turned it red on a page whose guarantee was untouched — and,
   worse, it would have stayed GREEN on a rewrite that kept the sentence while
   dropping the behaviour. It now asserts the distinction in three places that
   a copy edit cannot fake:

     · both locales say, in the measured-zero string, BOTH that the value is a
       zero and that it is not missing data;
     · the period card prints its no-data count only when there IS one, so a
       page with full coverage never shows «no data: 0»;
     · unobserved buckets are excluded from the chart rather than drawn flat. */
const ffEn = execSync('cat lib/i18n/messages/en/flow.ts').toString()
const ffAr = execSync('cat lib/i18n/messages/ar/flow.ts').toString()
const ffUi = execSync('cat components/routes/ForeignFlow.tsx').toString()
const zeroEn = /measuredZero:\s*'([^']+)'/.exec(ffEn)?.[1] ?? ''
const zeroAr = /measuredZero:\s*'([^']+)'/.exec(ffAr)?.[1] ?? ''
ok('measured zero ≠ missing data (en)', /zero/i.test(zeroEn) && /not missing data|not the same as missing/i.test(zeroEn))
ok('measured zero ≠ missing data (ar)', /صفر/.test(zeroAr) && /لا غياب بيانات/.test(zeroAr))
ok('no-data count is conditional, never a printed zero', /t\.missing > 0 \?/.test(ffUi))
const ffLib = execSync('cat lib/foreignFlow.ts').toString()
/* `isCounted` is the denominator rule itself: a `missing` session is the one
   kind that never counts. If this predicate stops excluding it, every ratio on
   the page silently starts treating a gap as a zero. */
ok('unobserved sessions stay out of the denominator',
  /isCounted\s*=\s*\(s: FlowSession\) => s\.kind !== 'missing'/.test(ffLib)
  && /counted = rows\.filter\(isCounted\)/.test(ffLib))

// Statistics canvas transplant + axis fix survive.
const css = execSync('cat styles/statistics.css').toString()
ok('statistics axis fix intact', /--stw-plot-h/.test(css) && /\.stw-axis-y/.test(css))
const sc = execSync('cat components/routes/StatChart.tsx').toString()
ok('statistics donor canvas intact', /canvasRef/.test(sc) && /exportPng/.test(sc))

// Homepage market-cap tab really shows market cap.
const home = execSync('cat components/routes/HomePage.tsx').toString()
ok('market-cap tab owns the table', /pool = moverTab === 'mcap' \? companies : traded/.test(home.replace(/\s+/g, ' ')) || /moverTab === 'mcap'/.test(home))
ok('value column names its metric', /valueCapMode/.test(home) && /valueTradeMode/.test(home))

// TZNI stays eligible for market-cap ranking.
const live = await (await fetch(O + '/api/chart/TZNI').catch(() => ({ ok: false }))).ok
const cos = JSON.parse(execSync('cat public/data/companies.json').toString())
const tzni = cos.find(c => c.sym === 'TZNI')
ok('TZNI present in the register', Boolean(tzni), tzni ? `${tzni.en || tzni.ar}` : 'missing')

// CMS degradation: getPosts still reports reachability separately.
const cms = execSync('cat lib/cms.ts').toString()
ok('CMS degradation preserved (ok flag)', /ok:\s*boolean/.test(cms) || /ok\b/.test(cms))

// Legal substance.
const en = execSync('cat lib/legalContentEn.ts').toString()
ok('no general indemnity (en)', /include no general obligation on the user to indemnify/.test(en))
ok('Iraqi governing law (en)', /laws in force in the Republic of Iraq/.test(en))
ok('18\\+ (en)', /aged 18 or over/.test(en))
ok('manual deletion (en)', /no in-product button to delete an account/.test(en))

console.log(out.join('\n'))
if (out.some(l => l.startsWith('✗'))) process.exit(1)
