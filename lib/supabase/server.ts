import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

/** Use this in API routes that need elevated privileges */
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

/**
 * A cookie-less anon reader, for public data on a page that must stay static.
 *
 * `createClient()` above awaits `cookies()`, and touching `cookies()` anywhere
 * in a route's tree opts that route out of prerendering — /news dropped from
 * `○` to `ƒ` the moment its loader used it, which scripts/route-markers.mjs
 * caught. Public tables read through the anon key need no session, so this
 * builds a client with no cookie adapter at all and the route stays static.
 *
 * Use it ONLY for data that is public by RLS. Anything user-scoped needs the
 * session, and therefore needs `createClient()` and a dynamic route.
 */
export function createPublicClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}
