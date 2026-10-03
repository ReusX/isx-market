/** @type {import('next').NextConfig} */
/*
 * Content-Security-Policy (2026-10 audit). Scripts only from this origin,
 * Cloudflare's captcha and Vercel's analytics; network calls only to this
 * origin, Supabase (auth, realtime) and the captcha; frames only the captcha.
 * 'unsafe-inline' stays for scripts because the pre-paint bootstrap and the
 * JSON-LD are inline and Next has no nonce here; what this blocks is any
 * script or connection to a host not listed. Dev adds 'unsafe-eval' (React
 * refresh). Images may come from any https host (company logos, news art).
 */
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://vitals.vercel-insights.com https://va.vercel-scripts.com",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "media-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const nextConfig = {
  /*
   * `next dev` and `next build` both write to .next by default, so running a
   * build while the dev server is up wipes the chunks that server is still
   * handing out — the page keeps returning 200 but every stylesheet 404s, and
   * you get a completely unstyled site with no error to explain it.
   *
   * The verification loop for this project runs a production build constantly
   * (npm run check:routes), so that collision is guaranteed rather than
   * unlucky. Those builds set NEXT_DIST_DIR and stay out of the dev server's
   * way. Unset — on Vercel, and for a plain `npm run build` — it is .next as
   * usual.
   */
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // Canonical URLs never have a trailing slash.
  // Next.js will 308-redirect /foo/ → /foo automatically.
  trailingSlash: false,

  /* No page uses next/image, so the optimizer (/_next/image) only added
     attack surface: several Next advisories live in it. Off. */
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'isc.gov.iq' },
      { protocol: 'https', hostname: 'qmedwacwicutqojngqhi.supabase.co' },
    ],
  },

  async redirects() {
    return [
      /*
       * ⚠ REMOVED · the two /en → / permanent redirects.
       *
       * They were correct when they were written. An earlier English tree had
       * been withdrawn, Google was still crawling its URLs, and a 301 to the
       * Arabic equivalent was the honest way to retire them.
       *
       * They are now the single thing that would make this whole bilingual
       * pass invisible: with them in place `/en/market` never reaches the
       * English route group at all — it 308s to `/market` — so the English
       * tree would be unreachable to readers and uncrawlable to Google, while
       * every page still advertised it in an `hreflang="en"`. That combination
       * is worse than having no English version, because it promises one.
       *
       * These were `permanent: true`, so browsers and Google have them cached.
       * Re-crawling clears it on Google's side; a reader with a stale cache
       * entry may need one hard reload. That cost is why this is recorded here
       * rather than quietly deleted.
       */

      // Delisted/invalid tickers Google discovered from an old source —
      // not in companies.json or price data. Send them to the company
      // list instead of returning a 404.
      /* /charts retired: the index chart lives on the homepage and expands in
         place. Permanent, so the old URL keeps whatever it earned. */
      { source: '/charts', destination: '/', permanent: true },
      { source: '/c/MTMT', destination: '/companies', permanent: true },
      { source: '/c/MTRA', destination: '/companies', permanent: true },
      /* Search Console 404 report, 17 Sep 2026: dead tickers Google still
         asks for (delisted money-transfer companies and mis-parsed codes),
         features the old site had, and article slugs that no longer exist.
         Each goes to the nearest living page, permanently. */
      ...['IMCL', 'MTIR', 'BDFD', 'BEIR', 'MTUM', 'ISIN', 'MTNI', 'MTMA', 'MYUN', 'AREB', 'MTAH', 'MTSB', 'MTAI', 'MTMO', 'MTNO', 'IMPI', 'MTNN', 'MTAM']
        .map((t) => ({ source: `/c/${t}`, destination: '/companies', permanent: true })),
      { source: '/foreign', destination: '/statistics/foreign-flow', permanent: true },
      { source: '/sector/:id', destination: '/companies', permanent: true },
      { source: '/wallet', destination: '/portfolio', permanent: true },
      { source: '/points', destination: '/', permanent: true },
      { source: '/quests', destination: '/', permanent: true },
      { source: '/rewards/:path*', destination: '/', permanent: true },
      { source: '/news/altdaol-fy-alaarak-dlyl-albdaa-fy-sok-alashm-alaaraky', destination: '/news', permanent: true },
      { source: '/news/isx-strong-opening-rsisx-rise', destination: '/news', permanent: true },
      { source: '/research/isx-banking-sector-analysis-q1-2026', destination: '/companies', permanent: true },
      /* The machine-written /analysis pages were retired (2026-10): each
         company's analysis now lands on its company page. */
      { source: '/analysis', destination: '/companies', permanent: true },
      { source: '/analysis/:sym', destination: '/c/:sym', permanent: true },
      /* An old news article links /financials; the statements live per company. */
      { source: '/financials', destination: '/companies', permanent: true },
    ]
  },

  async headers() {
    return [
      {
        source: '/data/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=1800, stale-while-revalidate=3600' },
        ],
      },
      /*
       * Baseline response headers. Vercel already sends HSTS; these are the
       * ones it does not.
       *
       * The CSP (const CSP above) also carries `frame-ancestors 'none'`:
       * a site with a login and a portfolio must not be framed.
       */
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
