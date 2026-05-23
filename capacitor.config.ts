import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.iraqsm.app',
  appName: 'ISX Market',
  webDir: 'out',

  // Load live site — all API routes, auth, and data stay on Vercel
  server: {
    url: 'https://iraqsm.com',
    cleartext: false,
    androidScheme: 'https',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#0B0E14',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'Dark',            // light text on dark background
      backgroundColor: '#0B0E14',
      overlaysWebView: false,
    },
  },

  android: {
    backgroundColor: '#0B0E14',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // set to true while developing
  },

  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0B0E14',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },
}

export default config
