'use client'

import { useEffect } from 'react'

/**
 * Detects if running inside a Capacitor native shell and:
 * 1. Adds platform class to <html> for safe-area CSS
 * 2. Initialises StatusBar plugin
 * 3. Hides SplashScreen after load
 */
export default function NativeBridge() {
  useEffect(() => {
    const init = async () => {
      // Only runs in the native Capacitor shell
      if (typeof (window as any).Capacitor === 'undefined') return

      const { Capacitor } = await import('@capacitor/core')
      const platform = Capacitor.getPlatform() // 'ios' | 'android' | 'web'

      if (platform === 'web') return

      // Add platform class to <html> for CSS safe-area rules
      document.documentElement.classList.add(`capacitor-${platform}`)

      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setStyle({ style: Style.Dark })
        await StatusBar.setBackgroundColor({ color: '#0B0E14' })
        if (platform === 'android') {
          await StatusBar.setOverlaysWebView({ overlay: false })
        }
      } catch (_) {}

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide({ fadeOutDuration: 300 })
      } catch (_) {}
    }

    init()
  }, [])

  return null
}
