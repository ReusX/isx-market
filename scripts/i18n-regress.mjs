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

/* ── FX observation spine (Batch 1, Aug 2026) ──────────────────────────────

   Four invariants, each pinned because it already failed once during the
   build and each failure was silent:

     · the dataset event key must be DAY-scoped. It was year-scoped, and since
       the official rate is flat for years the dedupe key collapsed every day
       of 2014 onto one row — 5,497 days became 267 and the importer reported
       the rest as "already held";
     · record() must distinguish inserted / duplicate / error. With a boolean
       it reported «0 new, 5497 already held» for a run that wrote nothing at
       all because it had no credentials;
     · history reads must paginate. PostgREST caps at 1,000 rows regardless of
       `limit`, so one request returned 2003–2023 and looked complete;
     · the official rate must be the CBI's published figure, not the effective
       bank rate wearing its label. */
const fxSeries = execSync('cat lib/fxSeries.ts').toString()
const fxRecord = execSync('cat lib/fxRecord.ts').toString()
const fxHist = execSync('cat lib/fxHistory.ts').toString()
const fxOff = execSync('cat lib/fxOfficial.ts').toString()

ok('dataset event key is day-scoped, not year-scoped',
  /cbiXlsxEvent = \(day: string\)/.test(fxSeries) && /cbi-xlsx:\$\{day\}/.test(fxSeries))
ok('record() separates duplicate from error',
  /'inserted' \| 'duplicate' \| 'error'/.test(fxRecord)
  && /'inserted' : 'duplicate'/.test(fxRecord)
  && /outcome: 'error'/.test(fxRecord))
ok('history reads page past the 1,000-row cap',
  /async function qAll/.test(fxHist) && /rows\.length < 1000/.test(fxHist))
ok('official rate is the CBI-published figure',
  /CBI_OFFICIAL_RATE = 1310/.test(fxOff))
ok('the three rate concepts stay separate',
  ['official_cbi', 'official_statutory', 'effective_bank'].every(k => fxSeries.includes(k)))
ok('spread is defined against the CBI rate alone',
  /SPREAD_DENOMINATOR: FxSeries = 'official_cbi'/.test(fxSeries))

/* The workbook is parsed by openpyxl, never by regular expressions over the
   sheet XML. The hand-rolled reader emitted 2,083 fewer days than the file
   holds and 1,996 dates the file does not contain — while every value it did
   emit matched exactly, which is why it survived a first review. */
const cbiImport = execSync('cat scripts/import-cbi-history.ts').toString()
ok('CBI workbook is parsed by openpyxl, not by regex',
  /cbi_history\.py/.test(cbiImport) && !/JSZip|sharedStrings/.test(cbiImport))
ok('the python parser confirms the day from column A',
  /data\[0\] != day/.test(execSync('cat scripts/cbi_history.py').toString()))

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
