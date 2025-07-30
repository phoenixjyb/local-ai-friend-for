# Android App Setup with Local LLM

This guide explains how to deploy the AI Companion Phone as an Android app with local LLM support using Ollama.

## Option 1: PWA Installation (Recommended for Quick Setup)

The app is already configured as a Progressive Web App (PWA) that can be installed directly on Android devices:

1. **Open in Chrome/Edge on Android**
   - Navigate to your deployed app URL
   - Chrome will show an "Add to Home Screen" prompt
   - Or tap the menu (⋮) → "Add to Home Screen"

2. **PWA Features**
   - Works offline with fallback responses
   - Installs like a native app
   - Full-screen experience
   - Push notifications support (if needed)

## Option 2: Native Android App (Capacitor)

To create a true native Android app:

### Prerequisites
- Node.js 18+
- Android Studio
- Java 17+

### Setup Steps

1. **Install Capacitor**
   ```bash
   npm install @capacitor/core @capacitor/cli
   npm install @capacitor/android
   ```

2. **Initialize Capacitor**
   ```bash
   npx cap init
   ```

3. **Add Android Platform**
   ```bash
   npx cap add android
   ```

4. **Build and Sync**
   ```bash
   npm run build
   npx cap sync
   ```

5. **Open in Android Studio**
   ```bash
   npx cap open android
   ```

6. **Build APK**
   - In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)

## Local LLM Setup with Ollama

For true offline AI functionality, you need to run Ollama on the device or a local server:

### Method 1: Ollama on Android (Termux)

1. **Install Termux** from F-Droid or Google Play
2. **Setup Ollama in Termux:**
   ```bash
   pkg update && pkg upgrade
   pkg install curl
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

3. **Pull a lightweight model:**
   ```bash
   ollama pull llama3.2:1b  # ~1.3GB, good for mobile
   # or even smaller:
   ollama pull phi3:mini    # ~2.3GB but very capable
   ```

4. **Start Ollama server:**
   ```bash
   ollama serve
   ```

5. **Configure app:** The app will automatically detect Ollama running on `localhost:11434`

### Method 2: Local Network Server

1. **Install Ollama on a computer/Raspberry Pi on the same network**
2. **Update app configuration** to point to the local server IP
3. **Modify the fetch URL** in `AICompanionPhone.tsx`:
   ```typescript
   const response = await fetch('http://192.168.1.100:11434/api/generate', {
   ```

### Recommended Models for Mobile

- **llama3.2:1b** - Smallest, fastest (~1.3GB)
- **phi3:mini** - Good balance of size/performance (~2.3GB)  
- **qwen2.5:0.5b** - Ultra-lightweight (~374MB)

## Performance Optimization

### For Android App
- Enable hardware acceleration in `capacitor.config.ts`
- Optimize bundle size by removing unused dependencies
- Use service workers for caching

### For Local LLM
- Use quantized models (Q4_0, Q5_0)
- Limit context length to save memory
- Consider running on dedicated hardware

## Testing

1. **Test PWA installation:** Open in Chrome → Install prompt
2. **Test offline functionality:** Turn off WiFi and mobile data
3. **Test local LLM:** Ensure Ollama is running and accessible
4. **Test voice features:** Grant microphone permissions

## Deployment Options

### Self-hosted
- Deploy to your own server
- Use with local Ollama instance
- Complete privacy and control

### Cloud with Local Fallback
- Deploy to Vercel/Netlify
- Falls back to local LLM when available
- Best of both worlds

## Security Considerations

- Local LLM keeps all data on device
- No external API calls when using local model
- PWA runs in secure context (HTTPS required for production)
- Consider implementing parental controls

## Troubleshooting

### Local LLM Issues
- Check if Ollama is running: `curl http://localhost:11434/api/tags`
- Verify model is installed: `ollama list`
- Check firewall settings on server

### Android Issues
- Enable "Install from unknown sources" for APK installation
- Grant microphone permissions for voice features
- Check Chrome's PWA installation requirements

## File Sizes
- PWA app: ~500KB
- Native Android APK: ~10-20MB
- Local LLM models: 374MB - 2.3GB

The app prioritizes local AI → cloud AI → fallback responses, ensuring it always works regardless of connectivity.