#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# ISX Market — Mobile App Setup
# Run once from the project root: bash scripts/setup-mobile.sh
# Requirements: Node 18+, npm, Android Studio (for Android), Xcode (for iOS)
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "📦 Installing dependencies..."
npm install

echo "⚙️  Initialising Capacitor platforms..."
npx cap add android || echo "(android already added)"
npx cap add ios    || echo "(ios already added)"

echo "🎨 Generating icons & splash screens from public/icon.png..."
# Requires a 1024×1024 PNG at public/icon.png
# and a 2732×2732 PNG at public/splash.png
npx @capacitor/assets generate \
  --iconBackgroundColor '#0B0E14' \
  --iconBackgroundColorDark '#0B0E14' \
  --splashBackgroundColor '#0B0E14' \
  --splashBackgroundColorDark '#0B0E14'

echo "🔄 Syncing web assets to native projects..."
npx cap sync

echo ""
echo "✅ Done! Next steps:"
echo ""
echo "  Android:"
echo "    npm run cap:android    # Opens Android Studio"
echo "    Then: Build → Generate Signed Bundle → upload to Play Console"
echo ""
echo "  iOS:"
echo "    npm run cap:ios        # Opens Xcode"
echo "    Then: Product → Archive → Distribute to App Store Connect"
echo ""
echo "  App IDs:"
echo "    Bundle ID:   com.iraqsm.app"
echo "    App Name:    ISX Market"
echo ""
