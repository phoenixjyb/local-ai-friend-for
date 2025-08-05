# Samsung S24 Ultra - WebView Crash Recovery Guide

## 🚨 Issue: "Uninstall WebView Update" Warning

This warning appears when Android System WebView has compatibility issues with your AI Companion app.

## ✅ Safe Recovery Steps

### Step 1: WebView Reset (Safest)
```bash
# Check WebView status
adb shell dumpsys webviewupdate

# Reset WebView implementation
adb shell cmd webviewupdate set-webview-implementation com.android.webview
```

### Step 2: Clear WebView Cache
```bash
# Clear all WebView data
adb shell pm clear com.android.webview
adb shell pm clear com.google.android.webview
adb shell pm clear com.google.android.webview.beta
```

### Step 3: Manual WebView Management
1. **Google Play Store** → "Android System WebView"
2. **Uninstall Updates** (not full uninstall)
3. **Restart Samsung S24**
4. **Reinstall latest version**

### Step 4: Chrome Update (Important)
1. **Google Play Store** → "Chrome"
2. **Update to latest version**
3. Chrome provides WebView on Samsung devices

## 🛠️ App-Specific Fixes

### Disable WebView Features Temporarily
If the issue persists, we can modify the app to be WebView-safe:

```javascript
// Add to capacitor.config.ts
const config: CapacitorConfig = {
  // ... existing config
  android: {
    webContentsDebuggingEnabled: false,
    allowMixedContent: false,
    clearTextTrafficPermitted: true
  }
}
```

### Alternative: Use System Browser
For localStorage access, use system browser instead of WebView:
```bash
# Open Chrome DevTools via system browser
adb shell am start -a android.intent.action.VIEW -d "chrome://inspect/#devices"
```

## 🔍 Diagnosis Commands

### Check WebView Status
```bash
# Current WebView implementation
adb shell dumpsys webviewupdate | grep "Current WebView package"

# Available WebView packages
adb shell pm list packages | grep webview

# WebView version info
adb shell dumpsys package com.android.webview | grep version
```

### Test WebView Functionality
```bash
# Test basic WebView
adb shell am start -n com.android.browser/.BrowserActivity -d "data:text/html,<h1>WebView Test</h1>"
```

## 🎯 For AI Companion Development

### Temporary Workaround
1. **Uninstall WebView updates** (safe - reverts to system version)
2. **Test AI Companion app** 
3. **Reinstall WebView** from Play Store
4. **Test again**

### Long-term Fix
We may need to adjust the app's WebView configuration to be more compatible with Samsung S24's WebView implementation.

## ⚠️ Important Notes

- **"Uninstall Updates"** ≠ **"Uninstall App"**
- Uninstalling WebView updates just reverts to system version
- This is a **safe operation** recommended by Android
- Your AI Companion app data won't be affected

## 🚀 Quick Recovery Command

```bash
# One-liner WebView reset
adb shell cmd webviewupdate set-webview-implementation com.android.webview && adb shell pm clear com.android.webview && echo "WebView reset complete - restart device"
```

After following these steps, your AI Companion app should start normally again!
