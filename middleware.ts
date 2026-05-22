import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/wallet', '/profile', '/leaderboard', '/quests', '/rewards']

export async function middleware(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh session — wrapped so a network error never crashes the site
    const { data: { user } } = await supabase.auth.getUser()

    // Redirect unauthenticated users away from protected routes
    const path = request.nextUrl.pathname
    if (!user && PROTECTED.some(p => path.startsWith(p))) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('auth', '1')
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch {
    // If Supabase is unreachable, let the request through — client-side auth handles it
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|public|data).*)'],
}
