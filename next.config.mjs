/** @type {import('next').NextConfig} */
const nextConfig = {
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
      // /en/ was crawled by Google — redirect cleanly to root
      { source: '/en', destination: '/', permanent: true },
      { source: '/en/:path*', destination: '/:path*', permanent: true },
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
