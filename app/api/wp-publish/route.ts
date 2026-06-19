import { NextRequest, NextResponse } from 'next/server'

// Pipeline proxy: GitHub Actions → this endpoint → WordPress.
// Bypasses Wordfence IP-blocking on Hostinger by routing WP REST calls
// through Vercel's server-side IPs instead of GitHub Actions IP ranges.
//
// Auth model:
//   Caller sends X-Pipeline-Secret (shared secret) to gate the endpoint.
//   WP credentials: either from Vercel env vars (WP_USERNAME + WP_APP_PASSWORD),
//   or from the X-Wp-Auth header sent by the caller (base64 user:pass).
//   Vercel env vars take priority when set.

export const maxDuration = 30
export const dynamic = 'force-dynamic'

const WP = (process.env.WP_API_URL ?? 'https://paleturquoise-deer-610016.hostingersite.com').replace(/\/$/, '')
const PIPELINE_SECRET = process.env.PIPELINE_SECRET ?? 'isx-pipeline-2026-secret'

function wpAuthHeader(req: NextRequest): string {
  // Prefer credentials stored in Vercel env (most secure)
  const user = process.env.WP_USERNAME
  const pass = process.env.WP_APP_PASSWORD
  if (user && pass) {
    return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
  }
  // Fallback: caller passes pre-encoded Basic auth via X-Wp-Auth
  const forwarded = req.headers.get('x-wp-auth')
  if (forwarded) return `Basic ${forwarded}`
  return ''
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-pipeline-secret')
  if (!secret || secret !== PIPELINE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { endpoint?: string; method?: string; payload?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const endpoint = body.endpoint ?? '/wp-json/wp/v2/posts'
  const method   = (body.method ?? 'POST').toUpperCase()
  const payload  = body.payload
  const auth     = wpAuthHeader(req)

  if (!auth) {
    return NextResponse.json({ error: 'No WP credentials' }, { status: 400 })
  }

  const wpRes = await fetch(`${WP}${endpoint}`, {
    method,
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json',
    },
    body: payload ? JSON.stringify(payload) : undefined,
  })

  let data: unknown
  try {
    data = await wpRes.json()
  } catch {
    data = { raw: await wpRes.text() }
  }

  return NextResponse.json(data, { status: wpRes.status })
}
