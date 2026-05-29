'use client'

import dynamic from 'next/dynamic'

// The chat widget is a below-the-fold floating button and pulls in Supabase.
// Load it only on the client, after hydration, so its JS stays off the
// initial render path.
const ChatWidget = dynamic(() => import('./ChatWidget'), { ssr: false })

export default function ChatWidgetLazy() {
  return <ChatWidget />
}
