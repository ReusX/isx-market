/**
 * «أرقام الخبر على IQWealth» — the site's own figures a story talks about.
 *
 * Board 2, page 5 puts a card beside the article that links to the live
 * numbers behind it: a story about the dollar links to /fx, one about a
 * bank's results to that company's page. This reads the story's title,
 * excerpt and tags for a few unambiguous words and returns routes; the
 * labels come from the rails (components/site/rails), so a page has one
 * name everywhere. Companies named in the article's `tickers` come first.
 */
const TOPICS: { route: string; words: RegExp }[] = [
  { route: '/fx', words: /دولار|الصرف|صرّاف|dollar|\bfx\b/i },
  { route: '/gold', words: /ذهب|مثقال|\bgold\b/i },
  { route: '/oil', words: /نفط|برميل|خام البصرة|\boil\b/i },
  { route: '/silver', words: /فضة|\bsilver\b/i },
  { route: '/banks', words: /مصرف|مصارف|بنك|بنوك|قرض|ودائع|بطاق|bank|loan|deposit|card/i },
  { route: '/inflation', words: /تضخم|inflation/i },
  { route: '/policy-rate', words: /سعر الفائدة|الفائدة الأساسي|policy rate/i },
  { route: '/currencies', words: /الريال|الليرة|اليورو|الدرهم|الدينار الكويتي|عملات|currenc/i },
  /* Last: «سوق» words are broad, so a bank or oil story keeps its own drawing. */
  { route: '/market', words: /بورصة|أسهم|سهم|ISX|سوق العراق للأوراق|stocks?\b|market\b/i },
]

const MAX = 4

export function articleFigures(text: string, tickers: string[] = []): string[] {
  const out: string[] = []
  for (const sym of tickers) {
    const s = sym.trim().toUpperCase()
    if (/^[A-Z0-9]{3,6}$/.test(s) && !out.includes(`/c/${s}`)) out.push(`/c/${s}`)
    if (out.length >= 2) break
  }
  for (const t of TOPICS) {
    if (out.length >= MAX) break
    if (t.words.test(text)) out.push(t.route)
  }
  /* A story that names none of these still gets the three numbers most
     readers came to the site for. */
  for (const r of ['/fx', '/gold', '/market']) {
    if (out.length >= 3) break
    if (!out.includes(r)) out.push(r)
  }
  return out
}

/** The drawn cover's topic: the story's theme before any one company it names. */
export function coverTopic(figures: string[]): string {
  return figures.find((r) => !r.startsWith('/c/')) ?? figures[0] ?? '/market'
}
