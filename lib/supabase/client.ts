import { createBrowserClient } from '@supabase/ssr'

// Single shared browser client. Creating multiple instances makes each set up
// its own GoTrue auth + navigator.locks, which can deadlock token reads so
// queries never fire (and logs "Multiple GoTrueClient instances detected").
// Memoizing one instance per tab is the recommended @supabase/ssr pattern.
let client: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return client
}
