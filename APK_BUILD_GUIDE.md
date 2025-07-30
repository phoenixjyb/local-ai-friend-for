# Quick APK Build Guide

## Step-by-Step Instructions

### 1. Prepare Your Environment
```bash
# Ensure you have these installed:
# - Node.js 18+
# - Android Studio with SDK
# - Java Development Kit 17
```

### 2. Initialize Capacitor (First Time Only)
```bash
# Run from your project root directory
npx cap init "AI Companion Phone" "com.aicompanion.phone"
```

### 3. Build Your Web App
```bash
npm run build
```

### 4. Add Android Platform (First Time Only)
```bash
npx cap add android
```

### 5. Sync Web Assets to Native Project
```bash
npx cap sync android
```

### 6. Build APK

#### Option A: Using Android Studio (Recommended)
```bash
# Open Android Studio with your project
npx cap open android

# In Android Studio:
# 1. Wait for Gradle sync to complete (bottom status bar)
# 2. Go to Build > Build Bundle(s) / APK(s) > Build APK(s)
# 3. Wait for build to complete
# 4. Click "locate" link to find your APK
```

#### Option B: Command Line Build
```bash
# Navigate to android directory
cd android

# Build debug APK (for testing)
./gradlew assembleDebug

# Build release APK (for distribution, requires signing)
./gradlew assembleRelease
```

### 7. Install APK on Device
```bash
# Method 1: Using ADB (if device connected via USB)
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Method 2: Share the APK file directly to your Android device
# The APK file is located at: android/app/build/outputs/apk/debug/app-debug.apk
```

## Quick Build Commands

```bash
# Complete build process in one command
npm run build:android

# Or step by step
npm run build
npx cap sync android
npx cap open android
```

## APK File Locations
- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**: `android/app/build/outputs/apk/release/app-release.apk`

## Features in Your APK
✅ Voice chat with British English support  
✅ Multiple AI personalities  
✅ Offline capability (when local LLM available)  
✅ Drawing/doodle sharing with AI  
✅ Conversation history  
✅ Child-friendly warm UI with particle effects  
✅ PWA functionality for easy installation  

## Testing Your APK
1. Install on Android device (voice features require physical device)
2. Grant microphone permission when prompted
3. Test voice recognition by tapping the call button
4. Try different personalities and drawing features
5. Test offline mode if you have local LLM setup

## Troubleshooting
- **Build fails**: Ensure Android SDK and Java are properly installed
- **Voice not working**: Test on physical device (emulator may not support voice)
- **App crashes**: Check Android logs with `adb logcat`
- **Permissions**: Grant microphone and storage permissions in Android settings

## Next Steps for Production
1. Set up app signing for release builds
2. Add custom app icons and splash screens  
3. Configure Termux integration for local LLM
4. Optimize performance for target devices
5. Test on various Android versions and devices