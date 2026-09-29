import { Readex_Pro } from 'next/font/google'
import { AppProvider } from '@/context/AppContext'
import { LocaleProvider } from '@/context/LocaleContext'
import { Analytics } from '@vercel/analytics/react'
import NativeBridge from '@/components/NativeBridge'
import { AppChrome } from '@/components/app/AppChrome'
import { HtmlFlags } from '@/components/site/HtmlFlags'
import { TesterInvite } from '@/components/site/TesterInvite'
import { SITE, absUrl } from '@/lib/seo'
import { dirOf, langOf, type Locale } from '@/lib/i18n/locale'
import { serializeLd } from '@/lib/jsonLd'

/**
 * The served document, for both languages.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * `lang` and `dir` have to be real attributes on the HTML that leaves the
 * server. A single root layout cannot know which language it is rendering
 * without `headers()`, and `headers()` opts every route into dynamic
 * rendering — it would have taken all 49 statically-prerendered routes with
 * it. So the app has TWO root layouts, `app/(ar)` and `app/(en)`, and they
 * both render this. The font, the theme bootstrap and the JSON-LD graph are
 * defined once, here, rather than kept in sync by hand in two files.
 *
 * ── The typeface ──────────────────────────────────────────────────────────
 * One face for both languages, all three roles. Readex Pro carries Arabic,
 * Latin and figures in a single geometric grotesk with a 160–700 weight axis,
 * which is what the identity asks for: light display type, regular body,
 * medium only on controls, and no bold anywhere. The three CSS variables are
 * kept — every stylesheet reads `--font-body`, `--font-display` or
 * `--font-numeric` — but they now resolve to the same family, and figures
 * line up through `font-variant-numeric: tabular-nums` rather than a
 * monospace face.
 */
const readex = Readex_Pro({
  subsets: ['arabic', 'latin'],
  weight: 'variable',
  axes: ['HEXP'],
  variable: '--font-sans',
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
        /* A data publisher, not a place of business: there used to be a
           separate `FinancialService` (LocalBusiness) node here, which Google
           read as a local business missing an address and phone. The site
           has neither; what it has is a market and a subject, and those
           belong on the Organization. */
        description: 'Market data and guides for the Iraq Stock Exchange (ISX) and the Iraqi economy · prices, indices, filings, bank rates, dollar and gold.',
        areaServed: { '@type': 'Country', name: 'Iraq' },
        knowsAbout: ['Iraq Stock Exchange', 'ISX60', 'Iraqi dinar', 'Iraqi banks'],
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
      className={readex.variable}
      suppressHydrationWarning
    >
      <head>
        {/* Pre-paint: a stored choice wins, else the OS preference. The
            attribute is ALWAYS stamped, because every stylesheet — the new
            tokens and the not-yet-rebuilt ones alike — keys on it; leaving it
            off would split the page between two themes. */}
        {/* App mode (lib/appMode.ts), also pre-paint: inside the IQWealth app
            the website chrome must never flash, and the launch URL (/) goes
            straight to the reader's start page. `?app=1` / `?app=0` turn a
            browser preview of the app frame on and off. The start-page rule
            mirrors startRoute() in lib/appMode.ts. */}
        <script
          dangerouslySetInnerHTML={{ __html: `(function(){try{var d=document.documentElement,q=location.search,ls=localStorage;if(/[?&]app=1/.test(q))ls.setItem('iq.app.preview','1');if(/[?&]app=0/.test(q))ls.removeItem('iq.app.preview');var C=window.Capacitor;if(!((C&&C.isNativePlatform&&C.isNativePlatform())||/IQWealthApp/.test(navigator.userAgent)||ls.getItem('iq.app.native')==='1'||ls.getItem('iq.app.preview')==='1'))return;window.__iqApp=1;d.classList.add('is-app');var vf=function(){var m=document.querySelector('meta[name=viewport]');if(m&&m.content.indexOf('viewport-fit')<0)m.content+=', viewport-fit=cover'};vf();document.addEventListener('DOMContentLoaded',vf);var p=location.pathname,en=p==='/en'||p.indexOf('/en/')===0,r=en?(p.slice(3)||'/'):p,E=en?'/en':'',m=/^\\/currencies\\/([a-z]{3})$/.exec(r);if(r==='/fx'||r==='/fx/100-dollar')return location.replace(E+'/app/fx');if(r==='/currencies')return location.replace(E+'/app/currencies');if(r==='/gold'||r.indexOf('/gold/')===0)return location.replace(E+'/app/gold');var A={'/market':'/app/market','/companies':'/app/companies','/banks':'/app/banks'};if(A[r])return location.replace(E+A[r]);if(m)return location.replace(E+'/app/currencies/'+m[1]);if(r!=='/'||sessionStorage.getItem('iq.app.started')==='1')return;sessionStorage.setItem('iq.app.started','1');var P=JSON.parse(ls.getItem('iq.app')||'null'),T={fx:'/app/fx',gold:'/app/gold',market:'/app/market',banks:'/app/banks',economy:'/oil',learn:'/learn',news:'/news'},s='/app';if(P&&P.interests&&P.interests.length){if(P.start==='last')s=P.last||'/app';else if(P.start==='auto')s=P.interests.length===1?T[P.interests[0]]:'/app';else if(P.start!=='home'&&T[P.start]&&P.interests.indexOf(P.start)>=0)s=T[P.start];}location.replace(E+s);}catch(e){}})();` }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: `window.__iqFlags=function(){try{var d=document.documentElement,t=localStorage.getItem('theme');if(t!=='dark'&&t!=='light')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.setAttribute('data-theme',t);if(localStorage.getItem('iq-welcome')==='off')d.setAttribute('data-welcome','off');if(window.__iqApp)d.classList.add('is-app');}catch(e){}};window.__iqFlags();` }}
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeLd(graph(locale)) }}
        />
        <HtmlFlags />
        <AppProvider>
          <LocaleProvider locale={locale}>
            {children}
            <NativeBridge />
            <AppChrome />
            <TesterInvite />
          </LocaleProvider>
          {/* Web Analytics only. Speed Insights (real-user Core Web
              Vitals) was removed: it fired ~1 event per page view against a
              10K/month Hobby quota it had nearly exhausted, and nobody read
              it — PageSpeed Insights covers the same ground on demand. */}
          <Analytics />
        </AppProvider>
      </body>
    </html>
  )
}
