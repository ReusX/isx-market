/**
 * An article's featured image — or, when the article has none, its cover.
 *
 * Every article gets the slot (user, 2026-10-02: «each article needs a place
 * for featured image»). A real image fills it edge to edge; without one the
 * slot draws the story's topic in the board's ink (board 1, «الرسوم»): the
 * dinar coin for money, the bars for gold, the board for the exchange, the
 * barrel for oil and the economy, the bank for banking — on a halftone of
 * that world's ink. The topic is a route from lib/articleFigures.
 */
type World = 'dinar' | 'ochre' | 'lapis' | 'tile'

const TOPIC: Record<string, { world: World; art: 'coin' | 'bars' | 'board' | 'barrel' | 'bank' }> = {
  '/fx': { world: 'dinar', art: 'coin' },
  '/currencies': { world: 'dinar', art: 'coin' },
  '/gold': { world: 'ochre', art: 'bars' },
  '/silver': { world: 'ochre', art: 'bars' },
  '/market': { world: 'lapis', art: 'board' },
  '/oil': { world: 'tile', art: 'barrel' },
  '/inflation': { world: 'tile', art: 'barrel' },
  '/policy-rate': { world: 'tile', art: 'bank' },
  '/banks': { world: 'tile', art: 'bank' },
}

function Art({ art }: { art: 'coin' | 'bars' | 'board' | 'barrel' | 'bank' }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (art) {
    case 'coin': return <><circle cx="32" cy="32" r="24" {...p} strokeWidth={3} fill="var(--cov-fill)" /><circle cx="32" cy="32" r="17" {...p} strokeWidth={1.6} strokeDasharray="3 4" /><path d="M26 21v22h5a11 11 0 0 0 0-22z" {...p} strokeWidth={3} /></>
    case 'bars': return <><path d="M10 44l8-18h28l8 18z" {...p} strokeWidth={3} fill="var(--cov-fill)" /><path d="M18 26l4-8h20l4 8" {...p} strokeWidth={2.6} /><path d="M24 36h16" {...p} strokeWidth={2.6} /></>
    case 'board': return <><rect x="10" y="12" width="44" height="40" rx="4" {...p} strokeWidth={3} fill="var(--cov-fill)" /><path d="M16 42l9-10 7 6 10-13 6 5" {...p} strokeWidth={3} /></>
    case 'barrel': return <><rect x="20" y="12" width="24" height="40" {...p} strokeWidth={3} fill="var(--cov-fill)" /><path d="M18 12h28M18 52h28" {...p} strokeWidth={3} /><path d="M20 26h24M20 38h24" {...p} strokeWidth={2} /></>
    case 'bank': return <><path d="M10 26h44L32 12z" {...p} strokeWidth={3} fill="var(--cov-fill)" /><path d="M16 30v16M26 30v16M38 30v16M48 30v16M10 50h44" {...p} strokeWidth={3} /></>
  }
}

export function ArticleCover({ image, topic, alt, size = 'lg', priority = false }: {
  image: string | null
  topic: string
  alt: string
  size?: 'lg' | 'sm'
  priority?: boolean
}) {
  if (image) {
    return (
      <figure className={`acv is-${size} has-img`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={alt} loading={priority ? 'eager' : 'lazy'} />
      </figure>
    )
  }
  const t = topic.startsWith('/c/') ? { world: 'lapis' as World, art: 'board' as const } : TOPIC[topic] ?? TOPIC['/market']
  return (
    <figure className={`acv is-${size}`} data-world={t.world} aria-hidden="true">
      <svg className="acv-art" viewBox="0 0 64 64"><Art art={t.art} /></svg>
      <span className="acv-mark">IQWealth</span>
    </figure>
  )
}
