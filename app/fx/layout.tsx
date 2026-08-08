import { buildFxFaq, CBI_OFFICIAL_RATE, marketRate, getFx } from '@/lib/fxCopy'

/*
 * Title and description live in ./page.tsx, not here, because they carry the
 * live rate and so have to be built from the fetch. A page-level `metadata`
 * export overrides the layout's entirely, so keeping a second copy here would
 * silently win nothing and lose the canonical.
 *
 * `getFx` below is the memoized accessor, not `fetchFx` — see lib/fxCopy.ts.
 * Calling the raw scrape here as well as in the page and its metadata is what
 * made a 90-second build run past ten minutes.
 */

const ar = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

export default async function FxLayout({ children }: { children: React.ReactNode }) {
  const fx = await getFx()
  const faq = buildFxFaq(fx)
  const market = marketRate(fx)

  const fxSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': 'https://iraqsm.com/fx',
        url: 'https://iraqsm.com/fx',
        name: 'سعر الدولار اليوم في العراق · الدولار مقابل الدينار العراقي',
        description: 'سعر صرف الدولار الأمريكي مقابل الدينار العراقي اليوم، السعر الرسمي وسعر السوق الموازية، ومحول العملات IQD/USD.',
        inLanguage: ['ar-IQ', 'en'],
        // The rate's own date, so the SERP can show when this was last true.
        ...(fx?.date ? { dateModified: fx.date } : {}),
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'IQWealth', item: 'https://iraqsm.com' },
            { '@type': 'ListItem', position: 2, name: 'سعر الدولار في العراق', item: 'https://iraqsm.com/fx' },
          ],
        },
      },
      {
        // Same `faq` array the page renders below · structured data that
        // disagrees with the visible copy is worse than none, and these two
        // had already drifted apart when they were maintained separately.
        '@type': 'FAQPage',
        mainEntity: faq.map(item => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(fxSchema) }} />

      {children}

      {/* Server-rendered SEO content (Arabic · matches the top dollar queries).
          The converter above is the interactive part; this gives crawlers
          substantial, relevant text the client-only widget doesn't. */}
      <section
        dir="rtl"
        aria-label="سعر الدولار في العراق"
        style={{
          maxWidth: 800, margin: '0 auto', padding: '32px 24px 8px',
          borderTop: '1px solid var(--line, #1f2937)', lineHeight: 1.85,
          fontSize: 15, color: 'var(--ink3, #9ca3af)', textAlign: 'right',
        }}
      >
        <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink, #e5e7eb)', marginBottom: 14 }}>
          سعر الدولار اليوم في العراق مقابل الدينار العراقي
        </h2>
        <p style={{ marginBottom: 16 }}>
          يتابع العراقيون يومياً سعر صرف الدولار الأمريكي مقابل الدينار العراقي (USD/IQD)، إذ يؤثر هذا السعر مباشرة على
          الأسعار والتجارة والاستيراد. يوجد سعران رئيسيان: السعر الرسمي الذي يحدده البنك المركزي العراقي
          {' '}(<bdi>{ar(CBI_OFFICIAL_RATE)}</bdi> ديناراً لكل دولار) ويُعتمد في مزاد العملة والمعاملات الحكومية
          والمصرفية، وسعر السوق الموازية (الحرة)
          {market ? <> البالغ اليوم نحو <bdi>{ar(market)}</bdi> ديناراً</> : null} المتداوَل فعلياً في محال الصرافة
          والأسواق المحلية في بغداد وبقية المحافظات، والذي يكون عادة أعلى من السعر الرسمي.
        </p>
        <p style={{ marginBottom: 16 }}>
          توفّر هذه الصفحة محوّل عملات فوري بين الدينار العراقي والدولار الأمريكي، إضافة إلى مقارنة بين السعر الرسمي
          وسعر السوق وأسعار الحوالات. لحساب سعر أي مبلغ · مثل سعر 100 دولار بالدينار العراقي · أدخل القيمة في الحاسبة
          أعلاه.
        </p>
        {/*
          The reverse-direction phrasing (dinar → dollar) used to live in a
          hidden second <h1> here. That h1 was removed because two h1s on one
          page is a real defect, but its phrases were not relocated, so
          "سعر صرف الدينار العراقي" and "الدينار العراقي مقابل الدولار" fell off
          the page entirely. They belong in prose, not in a hidden heading.
        */}
        <p style={{ marginBottom: 24 }}>
          يُعرض سعر صرف الدينار العراقي مقابل الدولار الأمريكي بالاتجاهين: كم ديناراً يساوي الدولار الواحد، وكم دولاراً
          يساوي مبلغ معيّن بالدينار. الدينار العراقي مقابل الدولار{market ? <> عند نحو <bdi>{ar(market)}</bdi> ديناراً
          للدولار في السوق الموازية</> : null}، ويمكن عكس الاتجاه في المحوّل أعلاه لحساب قيمة أي مبلغ بالدينار
          بالدولار الأمريكي.
        </p>

        {/*
          One English paragraph, LTR. The old description carried a sentence of
          English ("Live USD to Iraqi Dinar exchange rate and currency
          converter") and the rewrite dropped it to stay inside the ~160
          characters a snippet gets. English queries — usd to iqd, iraqi dinar
          to dollar — then had almost nothing on the page to match. A snippet is
          the wrong place to buy that coverage; body copy is the right one.
        */}
        <div dir="ltr" style={{ textAlign: 'left', marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink, #e5e7eb)', marginBottom: 10 }}>
            USD to IQD · Iraqi Dinar exchange rate today
          </h2>
          <p style={{ margin: 0 }}>
            The Iraqi dinar to dollar exchange rate is quoted two ways. The official Central Bank of Iraq rate is
            fixed at <bdi>{ar(CBI_OFFICIAL_RATE)}</bdi> IQD per US dollar and applies to the currency auction and
            official banking and import transactions. The parallel (market) rate
            {market ? <> — currently around <bdi>{ar(market)}</bdi> IQD per dollar</> : null} is the rate actually
            dealt at exchange shops in Baghdad and the provinces, and it normally trades above the official one.
            Use the live USD/IQD currency converter above to price any amount in either direction.
          </p>
        </div>

        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink, #e5e7eb)', marginBottom: 12 }}>
          أسئلة شائعة عن سعر الدولار في العراق
        </h2>
        {faq.map(item => (
          <div key={item.q} style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink, #e5e7eb)', margin: '0 0 4px' }}>{item.q}</h3>
            <p style={{ margin: 0 }}>{item.a}</p>
          </div>
        ))}
      </section>
    </>
  )
}
