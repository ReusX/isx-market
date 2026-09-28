import type { CapacitorConfig } from '@capacitor/cli'

/**
 * The IQWealth app: a native shell around the live site.
 *
 * `server.url` loads iraqsm.com itself, so every page, API route and data
 * refresh is the website's — an app release is only needed when the SHELL
 * changes (icon, permissions, plugins), never for content. What the shell
 * adds is what a browser cannot do: push notifications (see
 * components/NativeBridge.tsx and lib/nativePush.ts).
 *
 * Links to any other host (the pension portal, WhatsApp, the ISC) leave the
 * app and open in the phone's browser — Capacitor's default for navigation
 * outside `server.url`.
 *
 * `webDir` is a one-page fallback bundled into the app, required by the
 * Capacitor CLI; the site replaces it as soon as it loads.
 */
const config: CapacitorConfig = {
  appId: 'com.iraqsm.app',
  appName: 'IQWealth',
  webDir: 'native-shell',

  server: {
    url: 'https://iraqsm.com',
    cleartext: false,
    androidScheme: 'https',
    // Shown instead of the WebView's own error page when the site can't load (no connection).
    errorPath: 'offline.html',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#1A2035',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    // Edge to edge: the page draws under the status and navigation bars and
    // gets their sizes as --safe-area-inset-* (styles/app.css).
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
    PushNotifications: {
      // iOS: still show a notification that arrives while the app is open.
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },

  // Lets the site recognise the app before its JavaScript runs (Document.tsx
  // pre-paint script), so the website chrome never flashes on launch.
  appendUserAgent: 'IQWealthApp',

  android: {
    backgroundColor: '#F5F2EC',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  ios: {
    contentInset: 'automatic',
    backgroundColor: '#F5F2EC',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },
}

export default config
