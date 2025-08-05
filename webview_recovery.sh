#!/bin/bash

# WebView Recovery Script for AI Companion App
# Usage: ./webview_recovery.sh

echo "🛠️ WebView Recovery for AI Companion App"
echo "========================================"

# Check device connection
if ! adb devices | grep -q "device$"; then
    echo "❌ No device connected"
    exit 1
fi

echo "📱 Device: $(adb shell getprop ro.product.model)"

# Check current WebView status
echo "🔍 Current WebView status:"
adb shell dumpsys webviewupdate | head -5

echo ""
echo "🎯 WebView Recovery Options:"
echo "1. Clear WebView cache (safest)"
echo "2. Reset WebView implementation" 
echo "3. Show manual instructions"
echo "4. Test WebView functionality"

read -p "Choose option (1-4): " choice

case $choice in
    1)
        echo "🧹 Clearing WebView cache..."
        adb shell pm clear com.android.webview
        adb shell pm clear com.google.android.webview
        echo "✅ WebView cache cleared"
        echo "💡 Please restart your device and try the AI Companion app"
        ;;
    2)
        echo "🔄 Resetting WebView implementation..."
        adb shell cmd webviewupdate set-webview-implementation com.android.webview
        echo "✅ WebView implementation reset"
        echo "💡 Please restart your device"
        ;;
    3)
        echo "📋 Manual Recovery Steps:"
        echo ""
        echo "1. Open Settings → Apps → Android System WebView"
        echo "2. Click 'Uninstall Updates' (NOT uninstall)"
        echo "3. Restart Samsung S24"
        echo "4. Open Google Play Store → Android System WebView"
        echo "5. Install/Update to latest version"
        echo "6. Also update Chrome from Play Store"
        echo "7. Restart device again"
        echo "8. Test AI Companion app"
        ;;
    4)
        echo "🧪 Testing WebView functionality..."
        
        # Test basic WebView
        echo "Testing basic WebView loading..."
        adb shell am start -a android.intent.action.VIEW -d "data:text/html,<h1>WebView Test - If you see this, WebView works</h1>"
        
        echo "✅ WebView test launched"
        echo "💡 If you see the test page, WebView is working"
        echo "   If it crashes, WebView needs to be fixed"
        ;;
    *)
        echo "❌ Invalid option"
        ;;
esac

echo ""
echo "🔍 After recovery, check WebView status:"
echo "adb shell dumpsys webviewupdate | head -5"
