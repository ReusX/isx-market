import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        /*
         * `/profile` is deliberately NOT disallowed here. Blocking a URL stops
         * Google fetching it, which means it never sees the page's noindex —
         * and a blocked URL can still be listed in results, just without a
         * snippet. The page carries `robots: { index: false }` instead, which
         * is the directive that actually keeps it out.
         */
        disallow: ['/api/'],
      },
    ],
    sitemap: 'https://iraqsm.com/sitemap.xml',
    host: 'https://iraqsm.com',
  }
}
