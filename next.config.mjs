/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'isc.gov.iq' },
      { protocol: 'https', hostname: 'qmedwacwicutqojngqhi.supabase.co' },
    ],
  },
  // Allow Arabic font from Google Fonts + ISX portal
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
