# Cross-Platform Development Guide

## Platform Compatibility

This project is designed to work across different development environments:

### Windows Environment
- Node.js v24.5.0
- React v18.3.1
- React Native v0.76.5
- Expo v52

### macOS Environment
- Node.js (various versions)
- React 18.3.1 (standardized)
- Capacitor for native builds

## Installation Instructions

### First Time Setup (Any Platform)
```bash
npm run install:cross-platform
```

### If You Have Dependency Issues
```bash
npm run install:clean
```

### Standard Installation (with lock file)
```bash
npm ci --legacy-peer-deps
```

## Building APK

### For Samsung Galaxy S24 Ultra (Optimized)
```bash
./build-s24-apk.sh
```

### Standard Android Build
```bash
npm run build:android
```

## Key Features

1. **Legacy Peer Dependencies**: Uses `--legacy-peer-deps` to handle React version conflicts
2. **React 18 Base**: Standardized on React 18.3.1 for maximum compatibility
3. **Overrides**: Package.json overrides ensure consistent React versions
4. **Cross-Platform Scripts**: Separate scripts for different platforms and use cases

## Troubleshooting

### If you get ERESOLVE errors:
```bash
rm -rf node_modules package-lock.json
npm run install:cross-platform
```

### If Android build fails:
1. Check that Java 17+ is installed
2. Ensure Android SDK is properly configured
3. Clear Gradle cache: `cd android && ./gradlew clean`

### Platform-Specific Notes

#### Windows
- Use Git Bash or PowerShell for running shell scripts
- Ensure WSL is available if using Linux-style commands

#### macOS
- Native shell script support
- Ensure Xcode Command Line Tools are installed
