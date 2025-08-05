#!/bin/bash

# Quick AI Companion Log Test - Samsung S24 Ultra
# Usage: ./quick_log_test.sh

echo "🚀 Quick AI Companion Log Test"
echo "=============================="

# Check ADB connection
if ! adb devices | grep -q "device$"; then
    echo "❌ No Android device connected"
    exit 1
fi

# Set the correct package name
PACKAGE_NAME="com.aicompanion.phone"

echo "📱 Device: $(adb shell getprop ro.product.model)"
echo "📦 Package: $PACKAGE_NAME"

# Verify app is installed
if adb shell pm list packages | grep -q "$PACKAGE_NAME"; then
    echo "✅ AI Companion app found!"
else
    echo "❌ AI Companion app not found"
    echo "🔍 Available AI/Companion packages:"
    adb shell pm list packages | grep -i -E "(companion|ai)" | grep -v -E "(android|samsung|google)"
    exit 1
fi

# Create quick log directory
mkdir -p quick_logs_$(date +%H%M%S)
cd quick_logs_$(date +%H%M%S)

echo "🎯 Extracting logs..."

# Get recent system logs with ASR/voice keywords
echo "📋 System logs with ASR keywords..."
adb logcat -d -t 1000 | grep -i -E "(ASR|voice|speech|recognition|samsung.*voice|aborted)" > asr_system_logs.txt

# Get WebView console logs
echo "📋 WebView console logs..."
adb logcat -d -s "chromium" "ConsoleMessage" "SystemWebViewClient" > webview_logs.txt

# Get app-specific logs
echo "📋 App-specific logs..."
adb logcat -d | grep "$PACKAGE_NAME" > app_logs.txt

# Check Downloads folder
echo "📋 Checking Downloads..."
adb shell "ls -la /sdcard/Download/ | grep -i log" > downloads_list.txt 2>/dev/null || echo "No log files found" > downloads_list.txt

# Summary
echo "✅ Quick extraction complete!"
echo "📁 Files created:"
ls -la
echo ""
echo "🔍 Quick analysis:"
echo "ASR logs: $(wc -l < asr_system_logs.txt) lines"
echo "WebView logs: $(wc -l < webview_logs.txt) lines" 
echo "App logs: $(wc -l < app_logs.txt) lines"

echo ""
echo "🎯 Next: Run the ASR test in your app, then run this script again!"
