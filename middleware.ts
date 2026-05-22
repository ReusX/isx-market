import { NextResponse, type NextRequest } from 'next/server'

// Minimal passthrough middleware — auth protection handled client-side
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|public|data).*)'],
}
