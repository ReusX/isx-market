'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isNativeApp, permission, enablePush } from '@/lib/nativePush'

/**
 * The glue between iraqsm.com and the IQWealth app shell (Capacitor). Renders
 * nothing; on the plain website it returns before doing anything.
 *
 * In the app it:
 *  1. tags <html> with the platform, for safe-area CSS;
 *  2. paints the status bar in the page's own colour, light or dark — the
 *     shell's old fixed near-black predates the light theme;
 *  3. creates the Android notification channel the server sends on ('prices');
 *  4. re-registers for push on every launch when permission is already granted,
 *     so a token Firebase has rotated reaches the server (it never PROMPTS —
 *     asking is left to a user's tap on /notifications);
 *  5. opens the page a notification points to when it is tapped;
 *  6. shows a notification that arrives while the app is open as a banner —
 *     Android hands those to the app instead of the notification shade.
 */
interface Banner { title: string; body: string; url?: string }

const safePath = (url?: string) => (url && url.startsWith('/') && !url.startsWith('//') ? url : undefined)

export default function NativeBridge() {
  const router = useRouter()
  const [banner, setBanner] = useState<Banner | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!isNativeApp()) return
    let cancelled = false

    const init = async () => {
      const { Capacitor } = await import('@capacitor/core')
      const platform = Capacitor.getPlatform()
      document.documentElement.classList.add(`capacitor-${platform}`)

      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        const paint = async () => {
          const bg = getComputedStyle(document.body).backgroundColor
          const dark = document.documentElement.dataset.theme === 'dark' ||
            (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)
          /* Edge to edge: the page draws under the status and navigation bars
             (viewport-fit=cover, set pre-paint in Document.tsx) and the app's
             own top bar and tab bar colour them; only the icon tone is set here. */
          await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
          if (platform === 'android' && !document.documentElement.classList.contains('is-app')) {
            await StatusBar.setBackgroundColor({ color: rgbToHex(bg) ?? (dark ? '#0B0E14' : '#FFFFFF') })
          }
        }
        await paint()
        // Follow the theme toggle and the OS setting.
        new MutationObserver(() => { paint() }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
        matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { paint() })
      } catch { /* status bar is cosmetic */ }

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide({ fadeOutDuration: 300 })
      } catch { /* ignore */ }

      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')
        if (platform === 'android') {
          await PushNotifications.createChannel({
            id: 'prices', name: 'الأسعار والتنبيهات',
            description: 'سعر الدولار والذهب اليومي وتنبيهات الأسعار التي تضعها',
            importance: 4, visibility: 1, vibration: true,
          })
        }
        await PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
          // Only ever a path on this site — never a URL a payload could point elsewhere.
          const url = safePath((a.notification.data as { url?: string } | undefined)?.url)
          if (url) router.push(url)
        })
        await PushNotifications.addListener('pushNotificationReceived', (n) => {
          if (!n.title && !n.body) return
          setBanner({ title: n.title ?? '', body: n.body ?? '', url: safePath((n.data as { url?: string } | undefined)?.url) })
          clearTimeout(timer.current)
          timer.current = setTimeout(() => setBanner(null), 8000)
        })
        if (!cancelled && (await permission()) === 'granted') await enablePush()
      } catch { /* push is optional; the site works without it */ }
    }

    init()
    return () => { cancelled = true; clearTimeout(timer.current) }
  }, [router])

  if (!banner) return null
  return (
    <button
      type="button"
      className="nb-banner"
      role="status"
      onClick={() => { setBanner(null); if (banner.url) router.push(banner.url) }}
    >
      <strong>{banner.title}</strong>
      <span>{banner.body}</span>
    </button>
  )
}

function rgbToHex(rgb: string): string | null {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb)
  if (!m) return null
  return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')
}
