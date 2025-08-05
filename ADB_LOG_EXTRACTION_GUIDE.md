# ADB Log Extraction Commands for Samsung S24 Ultra AI Companion

## 🔧 Prerequisites
```bash
# Ensure ADB is installed and device is connected
adb devices
# Should show your Samsung S24 Ultra device
```

## 📱 Enable Developer Options & USB Debugging
1. **Settings** → **About phone** → Tap **Build number** 7 times
2. **Settings** → **Developer options** → Enable **USB debugging**
3. **Allow USB debugging** when prompted on device

## 🎯 Method 1: Direct WebView Storage Access (Root Not Required)

### Extract App's Local Storage Database
```bash
# Pull the entire WebView storage (contains localStorage)
adb shell "run-as io.ionic.starter cat /data/data/io.ionic.starter/app_webview/Local\ Storage/leveldb/000003.log" > ai_companion_logs_raw.txt
```

### Alternative Package Names (if different)
```bash
# If using different package name, find it first:
adb shell pm list packages | grep -i companion
adb shell pm list packages | grep -i ionic

# Then use the correct package name:
adb shell "run-as YOUR_PACKAGE_NAME cat /data/data/YOUR_PACKAGE_NAME/app_webview/Local\ Storage/leveldb/000003.log" > logs_raw.txt
```

## 🎯 Method 2: Logcat System Logs (Console Output)

### Capture Real-Time Logs
```bash
# Start capturing all logs from the app
adb logcat | grep -i "companion\|ionic\|ASR\|LLM\|TTS" > ai_companion_system_logs.txt

# Or filter by specific tags
adb logcat -s "chromium" "SystemWebViewClient" "ConsoleMessage" > webview_logs.txt
```

### Capture Historical Logs
```bash
# Get last 1000 lines of system logs
adb logcat -d -t 1000 | grep -E "(ASR|LLM|TTS|companion)" > ai_companion_historical.txt
```

## 🎯 Method 3: Using Chrome DevTools (Recommended)

### Setup Chrome DevTools for Android
```bash
# 1. Open Chrome on your computer
# 2. Navigate to: chrome://inspect/#devices
# 3. Enable "Discover USB devices"
# 4. Open your AI Companion app on Samsung S24
# 5. Click "inspect" next to your app in Chrome DevTools
```

### Extract Logs via DevTools Console
```javascript
// Run this in Chrome DevTools Console while inspecting your app:

// Get logs from localStorage
const logs = localStorage.getItem('ai_companion_logs');
const autoExport = localStorage.getItem('ai_companion_auto_export');

// Create downloadable files
function downloadLogs(data, filename) {
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Download main logs
if (logs) {
    downloadLogs(JSON.stringify(JSON.parse(logs), null, 2), 'ai_companion_logs.json');
}

// Download auto-export logs
if (autoExport) {
    downloadLogs(autoExport, 'ai_companion_auto_export.json');
}

// Or just copy to clipboard
console.log('=== AI COMPANION LOGS ===');
console.log(logs);
console.log('=== AUTO EXPORT LOGS ===');
console.log(autoExport);
```

## 🎯 Method 4: App-Level Export (Easiest)

### Trigger Export from Debug Panel
```bash
# 1. Open AI Companion app
# 2. Go to Debug Panel → Logs tab  
# 3. Click "Export Logs"
# 4. Then pull the downloaded file:

adb shell "ls /sdcard/Download/ | grep -i log"
adb pull /sdcard/Download/ai_companion_logs_*.txt ./
```

## 🎯 Method 5: Complete App Data Backup

### Backup Entire App Data (Requires ADB Backup)
```bash
# Create full app backup (includes all data)
adb backup -f ai_companion_backup.ab io.ionic.starter

# Extract backup (requires Java)
java -jar abe.jar unpack ai_companion_backup.ab ai_companion_backup.tar
tar -xf ai_companion_backup.tar
```

## 🚀 Quick Debug Script

Create this script for easy log extraction:

```bash
#!/bin/bash
# save as: extract_ai_companion_logs.sh

echo "🔍 Extracting AI Companion Logs from Samsung S24..."

# Create logs directory
mkdir -p ai_companion_logs_$(date +%Y%m%d_%H%M%S)
cd ai_companion_logs_$(date +%Y%m%d_%H%M%S)

echo "📱 Checking device connection..."
adb devices

echo "🎯 Method 1: System logs..."
adb logcat -d -t 2000 | grep -E "(ASR|LLM|TTS|companion|ionic|webview)" > system_logs.txt

echo "🎯 Method 2: Console logs..."
adb logcat -d -s "chromium" "SystemWebViewClient" "ConsoleMessage" > console_logs.txt

echo "🎯 Method 3: Checking Downloads folder..."
adb shell "ls /sdcard/Download/ | grep -i log" > download_files.txt

echo "🎯 Method 4: Pulling any exported logs..."
adb pull /sdcard/Download/ ./downloads/ 2>/dev/null

echo "✅ Log extraction complete!"
echo "📁 Files saved to: $(pwd)"
ls -la
```

## 📋 Usage Instructions

### Make Script Executable & Run
```bash
chmod +x extract_ai_companion_logs.sh
./extract_ai_companion_logs.sh
```

### Recommended Workflow
1. **Before testing**: Clear logs in Debug Panel
2. **Perform ASR test**: Run voice recognition test
3. **Export logs**: Use Debug Panel export button
4. **Extract via ADB**: Run the script above
5. **Analyze**: Review extracted logs for debugging

## 🎯 Pro Tips

### Real-Time Monitoring
```bash
# Monitor logs in real-time while testing
adb logcat | grep -E "(ASR|Samsung.*ASR|webkitSpeechRecognition)" --color=always
```

### Filter by Specific Issues
```bash
# Look for ASR abort errors specifically
adb logcat | grep -E "(aborted|ASR.*error|Samsung.*abort)" --color=always
```

This gives you comprehensive log access for debugging the Samsung S24 ASR issues! 🎤🔍
