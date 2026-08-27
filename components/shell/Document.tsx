import { IBM_Plex_Sans_Arabic, Noto_Kufi_Arabic, Roboto_Mono } from 'next/font/google'
import { AppProvider } from '@/context/AppContext'
import { LocaleProvider } from '@/context/LocaleContext'
import AppFrame from '@/components/shell/AppFrame'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import NativeBridge from '@/components/NativeBridge'
import { SITE, absUrl } from '@/lib/seo'
import { dirOf, langOf, type Locale } from '@/lib/i18n/locale'

/**
 * The served document, for both languages.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * `lang` and `dir` have to be real attributes on the HTML that leaves the
 * server. A single root layout cannot know which language it is rendering
 * without `headers()`, and `headers()` opts every route into dynamic
 * rendering — it would have taken all 49 statically-prerendered routes with
 * it. So the app has TWO root layouts, `app/(ar)` and `app/(en)`, and they
 * both render this. The fonts, the theme bootstrap and the JSON-LD graph are
 * defined once, here, rather than kept in sync by hand in two files.
 *
 * ── The typefaces ─────────────────────────────────────────────────────────
 * Both languages load the same three faces, deliberately. IBM Plex Sans Arabic
 * and Noto Kufi Arabic both carry full Latin sets, so the English side keeps
 * the product's actual voice instead of falling back to a system stack that
 * would make /en look like a different site. Roboto Mono keeps every figure
 * identical across languages, which matters more here than anywhere: the same
 * price has to look like the same price.
 */
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

const kufiArabic = Noto_Kufi_Arabic({
  subsets: ['arabic', 'latin'],
  // 400 is here for the homepage H1. The approved reference sets it at weight
  // 400 in Noto Kufi; without the face loaded the browser rounds up to 500 and
  // the page's largest word renders heavier than the design.
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-numeric',
  display: 'swap',
})

/**
 * The site-wide entity graph.
 *
 * ⚠ The `@id`s are Arabic-rooted in BOTH languages and that is correct: there
 * is one IQWealth and one website, described in two languages, not two
 * organisations. Minting `/en/#organization` would tell Google the English
 * pages belong to a second company. What varies per locale is the `description`
 * and the search-action target — the things that genuinely differ — plus
 * `inLanguage`, which lists both because the site genuinely serves both.
 */
function graph(locale: Locale) {
  const ar = locale === 'ar'
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': absUrl('/#website'),
        url: absUrl('/'),
        // Google reads the SERP site-name suffix from here. Keep it to the
        // bare brand — anything longer gets appended to every title.
        name: 'IQWealth',
        alternateName: ['IQWealth · بورصة العراق', 'Iraq Stock Market', 'بورصة العراق', 'سوق الاسهم العراقي'],
        description: ar
          ? 'بيانات بورصة العراق للأوراق المالية: الأسعار، المخططات، الإحصاءات وتدفقات المستثمر الأجنبي.'
          : 'Iraq Stock Exchange data: prices, charts, statistics and foreign investor flow.',
        inLanguage: ['ar-IQ', 'en'],
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${absUrl('/market', locale)}?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': absUrl('/#organization'),
        name: 'IQWealth',
        alternateName: ['Iraq Stock Market', 'iraqsm.com'],
        url: absUrl('/'),
        logo: { '@type': 'ImageObject', url: absUrl('/icon.png'), width: 1024, height: 1024 },
        image: absUrl('/icon.png'),
        /*
         * OTHER profiles of this same entity — never iraqsm.com itself, which
         * is what this used to list and which asserts nothing. This is the main
         * signal that ties the site to a real, known organisation, and brand
         * sitelinks are downstream of that. Add new accounts here as they are
         * created.
         */
        sameAs: [
          'https://www.facebook.com/Iraqstockmarket/',
          'https://www.instagram.com/iqwealthh/',
        ],
      },
      {
        '@type': 'FinancialService',
        '@id': absUrl('/#service'),
        name: 'Iraq Stock Exchange Market Tracker',
        description: 'Stock market data for the Iraq Stock Exchange (ISX) · prices, charts, indices and company analysis.',
        url: absUrl('/'),
        areaServed: { '@type': 'Country', name: 'Iraq' },
        serviceType: 'Stock Market Data',
      },
    ],
  }
}

export const SITE_ORIGIN = SITE

export function Document({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <html
      lang={langOf(locale)}
      dir={dirOf(locale)}
      data-theme="dark"
      className={`${plexArabic.variable} ${kufiArabic.variable} ${robotoMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();` }}
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graph(locale)) }}
        />
        <AppProvider>
          <LocaleProvider locale={locale}>
            <AppFrame>{children}</AppFrame>
            <NativeBridge />
          </LocaleProvider>
          <Analytics />
          <SpeedInsights />
        </AppProvider>
      </body>
    </html>
  )
}
