#!/bin/bash

# AI Companion Log Extraction Script for Samsung S24 Ultra
# Usage: ./extract_logs.sh

set -e

echo "🚀 AI Companion Log Extraction Tool"
echo "===================================="

# Create timestamped directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="ai_companion_logs_${TIMESTAMP}"
mkdir -p "$LOG_DIR"
cd "$LOG_DIR"

echo "📁 Created directory: $LOG_DIR"

# Check ADB connection
echo "📱 Checking device connection..."
if ! adb devices | grep -q "device$"; then
    echo "❌ No Android device connected via ADB"
    echo "💡 Please:"
    echo "   1. Enable Developer Options & USB Debugging"
    echo "   2. Connect device via USB"
    echo "   3. Accept USB debugging prompt"
    exit 1
fi

DEVICE=$(adb devices | grep "device$" | cut -f1)
echo "✅ Connected to device: $DEVICE"

# Get device info
echo "📋 Getting device information..."
adb shell getprop ro.product.model > device_model.txt
adb shell getprop ro.build.version.release > android_version.txt
echo "Device: $(cat device_model.txt) - Android $(cat android_version.txt)"

# Check if app is installed
echo "🔍 Checking for AI Companion app..."
PACKAGE_NAME=""

# First, try to find the exact package
if adb shell pm list packages | grep -q "com.aicompanion.phone"; then
    PACKAGE_NAME="com.aicompanion.phone"
elif adb shell pm list packages | grep -q "io.ionic.starter"; then
    PACKAGE_NAME="io.ionic.starter"
else
    # Search for likely package names
    echo "🔍 Searching for AI Companion related packages..."
    POSSIBLE_PACKAGES=$(adb shell pm list packages | grep -i -E "(companion|ionic|ai)" | grep -v -E "(android|samsung|google)" | head -5)
    
    if [ ! -z "$POSSIBLE_PACKAGES" ]; then
        echo "📱 Found possible AI Companion packages:"
        echo "$POSSIBLE_PACKAGES" | nl
        echo ""
        echo "💡 Please confirm which package is your AI Companion app:"
        echo "   Or manually set PACKAGE_NAME variable in this script"
        
        # Try the first likely candidate
        FIRST_CANDIDATE=$(echo "$POSSIBLE_PACKAGES" | head -1 | cut -d: -f2)
        echo "🎯 Trying first candidate: $FIRST_CANDIDATE"
        PACKAGE_NAME="$FIRST_CANDIDATE"
    fi
fi

if [ -z "$PACKAGE_NAME" ]; then
    echo "❌ AI Companion app not found on device"
    echo "💡 Please install the APK first"
    exit 1
fi

echo "✅ Found app: $PACKAGE_NAME"

# Method 1: System logs (console output)
echo "🎯 Extracting system logs..."
adb logcat -d -t 3000 | grep -E "(ASR|LLM|TTS|companion|ionic|webview|Samsung.*voice)" > system_logs.txt 2>/dev/null || echo "No system logs found"

# Method 2: WebView console logs
echo "🎯 Extracting WebView console logs..."
adb logcat -d -s "chromium:V" "SystemWebViewClient:V" "ConsoleMessage:V" > webview_console.txt 2>/dev/null || echo "No WebView logs found"

# Method 3: App-specific logs
echo "🎯 Extracting app-specific logs..."
adb logcat -d | grep "$PACKAGE_NAME" > app_specific_logs.txt 2>/dev/null || echo "No app-specific logs found"

# Method 4: Check Downloads folder for exported logs
echo "🎯 Checking Downloads folder..."
adb shell "ls -la /sdcard/Download/ 2>/dev/null | grep -i log" > download_log_files.txt 2>/dev/null || echo "No log files in Downloads"

# Pull any exported log files
echo "🎯 Pulling exported log files..."
mkdir -p downloads
adb shell "find /sdcard/Download/ -name '*log*' -o -name '*debug*' -o -name '*companion*' 2>/dev/null" | while read file; do
    if [ ! -z "$file" ]; then
        echo "Pulling: $file"
        adb pull "$file" downloads/ 2>/dev/null || true
    fi
done

# Method 5: Try to access WebView storage (may require root)
echo "🎯 Attempting WebView storage access..."
adb shell "run-as $PACKAGE_NAME ls /data/data/$PACKAGE_NAME/app_webview/ 2>/dev/null" > webview_structure.txt 2>/dev/null || echo "WebView storage access denied (normal)"

# Method 6: Chrome DevTools instructions
echo "🎯 Creating Chrome DevTools extraction script..."
cat > chrome_devtools_extraction.js << 'EOF'
// AI Companion Log Extraction Script for Chrome DevTools
// 1. Open Chrome and go to: chrome://inspect/#devices
// 2. Click "inspect" next to your AI Companion app
// 3. Paste and run this script in the Console tab

console.log('🚀 Starting AI Companion log extraction...');

// Extract localStorage logs
const mainLogs = localStorage.getItem('ai_companion_logs');
const autoExportLogs = localStorage.getItem('ai_companion_auto_export');

// Download function
function downloadFile(content, filename, contentType = 'application/json') {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`✅ Downloaded: ${filename}`);
}

// Export main logs
if (mainLogs) {
    try {
        const parsed = JSON.parse(mainLogs);
        downloadFile(JSON.stringify(parsed, null, 2), 'ai_companion_main_logs.json');
        console.log(`📊 Main logs: ${parsed.logs?.length || 0} entries`);
    } catch (e) {
        downloadFile(mainLogs, 'ai_companion_main_logs_raw.txt', 'text/plain');
        console.log('📊 Main logs: raw format');
    }
} else {
    console.log('❌ No main logs found in localStorage');
}

// Export auto-export logs
if (autoExportLogs) {
    downloadFile(autoExportLogs, 'ai_companion_auto_export.json');
    console.log('📊 Auto-export logs found');
} else {
    console.log('❌ No auto-export logs found');
}

// Show all localStorage keys
console.log('🔍 All localStorage keys:');
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    console.log(`  - ${key}: ${localStorage.getItem(key)?.length || 0} characters`);
}

console.log('✅ Log extraction complete! Check your Downloads folder.');
EOF

# Create summary report
echo "📋 Creating extraction summary..."
cat > extraction_summary.txt << EOF
AI Companion Log Extraction Summary
===================================
Date: $(date)
Device: $(cat device_model.txt) - Android $(cat android_version.txt)
Package: $PACKAGE_NAME

Files Extracted:
- system_logs.txt: System logs with ASR/LLM/TTS keywords
- webview_console.txt: WebView console output
- app_specific_logs.txt: App-specific logcat entries
- download_log_files.txt: List of log files in Downloads folder
- downloads/: Exported log files from device
- chrome_devtools_extraction.js: Script for Chrome DevTools

Instructions:
1. Review system_logs.txt for ASR errors
2. Check downloads/ folder for exported logs
3. Use chrome_devtools_extraction.js for localStorage access

Chrome DevTools Access:
1. Open Chrome → chrome://inspect/#devices
2. Click "inspect" next to AI Companion app
3. Run chrome_devtools_extraction.js in Console
EOF

# Show summary
echo "✅ Log extraction complete!"
echo ""
echo "📁 Extracted to: $(pwd)"
echo "📋 Files created:"
ls -la | grep -v "^total"
echo ""
echo "🎯 Next steps:"
echo "   1. Check system_logs.txt for ASR debug info"
echo "   2. Review downloads/ folder for app exports"
echo "   3. Use Chrome DevTools script for localStorage"
echo ""
echo "🔧 Chrome DevTools access:"
echo "   chrome://inspect/#devices → inspect → run chrome_devtools_extraction.js"

# Open the directory (macOS/Linux)
if command -v open >/dev/null 2>&1; then
    open .
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open .
fi
