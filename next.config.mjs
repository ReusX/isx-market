/** @type {import('next').NextConfig} */
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

  images: {
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
      { source: '/c/MTMT', destination: '/companies', permanent: true },
      { source: '/c/MTRA', destination: '/companies', permanent: true },
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
    ]
  },
}

export default nextConfig
