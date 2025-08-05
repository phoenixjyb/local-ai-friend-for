# Voice Recognition Visualization Test Guide

## 🎤 Testing the Wave Visualization Fix

### What was fixed:
1. **Minimum visualization time**: The wave plot will now stay visible for at least 3 seconds even if ASR fails
2. **Better error handling**: More detailed logging to identify what's causing quick failures
3. **Microphone permission check**: Explicit check for microphone access before starting ASR
4. **Enhanced logging**: Console logs to track visualization lifecycle

### How to test:

1. **Open the app**: Navigate to `http://localhost:5173/`
2. **Open Debug Panel**: Click the bug icon or debug button
3. **Go to ASR tab**: Click on "ASR Recognition" tab
4. **Watch the console**: Open browser developer tools (F12) to see detailed logs
5. **Test voice recognition**: Click "Test Voice Recognition" button

### Expected behavior:
- ✅ Wave visualization should appear immediately
- ✅ Visualization should stay visible for minimum 3 seconds
- ✅ Console should show detailed logs about what's happening
- ✅ If microphone permission is denied, you'll get a clear error message

### Console logs to watch for:
```
🎤 [DebugPanel] Starting ASR recognition test...
🎤 [DebugPanel] Checking microphone permissions...
🎤 [DebugPanel] Microphone access granted
🎵 [AudioVisualization] isListening changed to: true
🎵 [AudioVisualization] Initializing audio...
🎵 [AudioVisualization] Microphone stream obtained
🎵 [AudioVisualization] Audio context created
🎵 [AudioVisualization] Analyser node created
🎵 [AudioVisualization] Microphone connected to analyser
🎵 [AudioVisualization] Starting visualization...
```

### If ASR fails quickly:
- The visualization will still stay visible for 3 seconds
- Console will show if it's a Capacitor ASR failure vs Web ASR failure
- You'll see detailed error messages about what went wrong

### Debugging steps:
1. **Check microphone permission**: Make sure browser has microphone access
2. **Check console logs**: Look for specific error messages
3. **Try different browsers**: Test in Chrome, Safari, Firefox
4. **Samsung S24 specific**: If testing on device, check ADB logs using our scripts

### Quick fixes if still having issues:
- Refresh the page and try again
- Clear browser cache
- Check browser microphone settings
- Grant microphone permission if prompted

## 📱 Samsung S24 Testing
If testing on Samsung S24 Ultra, use the ADB log extraction to get detailed device logs:
```bash
./quick_log_test.sh
```
