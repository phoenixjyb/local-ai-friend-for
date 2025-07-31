#!/bin/bash

echo "🚀 Building AI Companion Phone APK..."

# Check if Capacitor is initialized
if [ ! -f "capacitor.config.ts" ]; then
    echo "⚠️  Capacitor not initialized. Initializing now..."
    npx cap init "AI Companion Phone" "com.aicompanion.phone"
fi

# Build the web app
echo "📦 Building web assets..."
npm run build

# Check if android platform exists
if [ ! -d "android" ]; then
    echo "📱 Adding Android platform..."
    npx cap add android
fi

# Sync web assets to native project
echo "🔄 Syncing assets to Android project..."
npx cap sync android

# Copy additional assets if needed
if [ -d "public/icons" ]; then
    echo "🎨 Copying app icons..."
    mkdir -p android/app/src/main/res/drawable
    cp public/icons/*.png android/app/src/main/res/drawable/ 2>/dev/null || true
fi

echo "✅ Build setup complete!"
echo ""
echo "Next steps:"
echo "1. Open Android Studio: npx cap open android"
echo "2. Build APK in Android Studio: Build > Build Bundle(s)/APK(s) > Build APK(s)"
echo "3. Or build from command line: cd android && ./gradlew assembleDebug"
echo ""
echo "📱 APK will be located at: android/app/build/outputs/apk/debug/app-debug.apk"