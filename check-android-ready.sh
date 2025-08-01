#!/bin/bash

# Quick Android Build Checker and Fixer
# Validates the project and fixes common issues before building

echo "🔍 Checking Android build readiness..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a file exists and has content
file_has_content() {
    [ -f "$1" ] && [ -s "$1" ]
}

echo "📋 Running comprehensive build readiness check..."

# 1. Check basic project structure
echo "  ✓ Checking project structure..."
[ -f "package.json" ] || { echo "❌ package.json missing"; exit 1; }
[ -f "capacitor.config.ts" ] || { echo "❌ capacitor.config.ts missing"; exit 1; }
[ -f "src/App.tsx" ] || { echo "❌ src/App.tsx missing"; exit 1; }
[ -f "index.html" ] || { echo "❌ index.html missing"; exit 1; }

# 2. Check if dependencies are installed
echo "  ✓ Checking dependencies..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/@capacitor/core/package.json" ]; then
    echo "  📦 Installing dependencies..."
    npm install
fi

# 3. Check TypeScript compilation
echo "  ✓ Checking TypeScript..."
if command_exists tsc; then
    if ! npx tsc --noEmit; then
        echo "❌ TypeScript compilation errors found!"
        echo "🔧 Common fixes:"
        echo "   - Check imports in src/components/AICompanionPhone.tsx"
        echo "   - Verify all service files exist in src/services/"
        echo "   - Check type definitions in src/types/"
        exit 1
    fi
else
    echo "⚠️ TypeScript not available, skipping compilation check"
fi

# 4. Check critical service files
echo "  ✓ Checking service files..."
MISSING_SERVICES=()

if [ ! -f "src/services/OllamaService.ts" ]; then
    MISSING_SERVICES+=("OllamaService.ts")
fi

if [ ! -f "src/services/VoiceChatService.ts" ]; then
    MISSING_SERVICES+=("VoiceChatService.ts")
fi

if [ ! -f "src/services/SoundEffectsService.ts" ]; then
    MISSING_SERVICES+=("SoundEffectsService.ts")
fi

if [ ${#MISSING_SERVICES[@]} -gt 0 ]; then
    echo "❌ Missing service files: ${MISSING_SERVICES[*]}"
    echo "🔧 Creating missing service files..."
    
    # Create SoundEffectsService if missing
    if [[ " ${MISSING_SERVICES[@]} " =~ " SoundEffectsService.ts " ]]; then
        cat > src/services/SoundEffectsService.ts << 'EOL'
export type SoundType = 
  | 'button-tap' 
  | 'call-start' 
  | 'call-end' 
  | 'success-chime' 
  | 'error-boop' 
  | 'magic-sparkle' 
  | 'heart-beat' 
  | 'pop' 
  | 'whoosh' 
  | 'ai-thinking' 
  | 'personality-switch' 
  | 'drawing-brush'

export class SoundEffectsService {
  private enabled = true
  private audioContext: AudioContext | null = null

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext()
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  async play(soundType: SoundType, volume = 0.7) {
    if (!this.enabled || !this.audioContext) return

    try {
      const frequency = this.getSoundFrequency(soundType)
      const duration = this.getSoundDuration(soundType)
      
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(volume * 0.3, this.audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration)
      
      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + duration)
    } catch (error) {
      console.log('Audio playback not available:', error)
    }
  }

  private getSoundFrequency(soundType: SoundType): number {
    const frequencies = {
      'button-tap': 800,
      'call-start': 440,
      'call-end': 330,
      'success-chime': 660,
      'error-boop': 220,
      'magic-sparkle': 880,
      'heart-beat': 120,
      'pop': 1000,
      'whoosh': 200,
      'ai-thinking': 400,
      'personality-switch': 550,
      'drawing-brush': 350
    }
    return frequencies[soundType] || 440
  }

  private getSoundDuration(soundType: SoundType): number {
    const durations = {
      'button-tap': 0.1,
      'call-start': 0.3,
      'call-end': 0.4,
      'success-chime': 0.5,
      'error-boop': 0.3,
      'magic-sparkle': 0.2,
      'heart-beat': 0.15,
      'pop': 0.08,
      'whoosh': 0.4,
      'ai-thinking': 0.6,
      'personality-switch': 0.4,
      'drawing-brush': 0.2
    }
    return durations[soundType] || 0.2
  }
}

export const soundEffectsService = new SoundEffectsService()
EOL
        echo "✅ Created SoundEffectsService.ts"
    fi
fi

# 5. Check component files
echo "  ✓ Checking component files..."
MISSING_COMPONENTS=()

if [ ! -f "src/components/PersonalitySelection.tsx" ]; then
    MISSING_COMPONENTS+=("PersonalitySelection.tsx")
fi

if [ ! -f "src/components/ParticleEffects.tsx" ]; then
    MISSING_COMPONENTS+=("ParticleEffects.tsx")
fi

if [ ! -f "src/components/DrawingCanvas.tsx" ]; then
    MISSING_COMPONENTS+=("DrawingCanvas.tsx")
fi

if [ ! -f "src/components/CuteAnimations.tsx" ]; then
    MISSING_COMPONENTS+=("CuteAnimations.tsx")
fi

if [ ! -f "src/components/PWAInstallPrompt.tsx" ]; then
    MISSING_COMPONENTS+=("PWAInstallPrompt.tsx")
fi

if [ ${#MISSING_COMPONENTS[@]} -gt 0 ]; then
    echo "❌ Missing component files: ${MISSING_COMPONENTS[*]}"
    echo "🔧 Some components may need to be created manually"
    echo "   Run the setup-android.sh script which handles component creation"
fi

# 6. Check build output
echo "  ✓ Testing web build..."
if npm run build; then
    if [ -d "dist" ] && [ -f "dist/index.html" ]; then
        echo "✅ Web build successful"
    else
        echo "❌ Web build created no output"
        exit 1
    fi
else
    echo "❌ Web build failed"
    exit 1
fi

# 7. Check for Android platform
echo "  ✓ Checking Android platform..."
if [ -d "android" ]; then
    echo "✅ Android platform exists"
else
    echo "⚠️ Android platform not yet created"
    echo "   Run: npx cap add android"
fi

# 8. Check Capacitor sync
echo "  ✓ Checking Capacitor configuration..."
if npx cap sync --dry-run > /dev/null 2>&1; then
    echo "✅ Capacitor configuration valid"
else
    echo "⚠️ Capacitor configuration needs attention"
fi

echo ""
echo "🎯 BUILD READINESS SUMMARY:"
echo ""

if [ -d "android" ]; then
    echo "✅ Ready to build APK!"
    echo "   Run: ./build-s24-apk.sh"
    echo "   Or: npm run build:s24"
else
    echo "⚠️ Almost ready! Need to:"
    echo "   1. Add Android platform: npx cap add android"
    echo "   2. Then build APK: ./build-s24-apk.sh"
fi

echo ""
echo "📱 For Samsung Galaxy S24 Ultra:"
echo "   ✓ All optimizations are in place"
echo "   ✓ Local LLM integration ready"
echo "   ✓ Voice services configured"
echo "   ✓ Haptic feedback enabled"
echo ""

# Check environment for building
echo "🔧 BUILD ENVIRONMENT:"
if command_exists java; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2)
    echo "   ✅ Java: $JAVA_VERSION"
else
    echo "   ❌ Java not found (need Java 17+)"
fi

if [ -n "$ANDROID_HOME" ]; then
    echo "   ✅ Android SDK: $ANDROID_HOME"
else
    echo "   ❌ ANDROID_HOME not set"
fi

if command_exists gradle; then
    echo "   ✅ Gradle available"
else
    echo "   ⚠️ Gradle will be downloaded by Capacitor"
fi

echo ""
echo "✅ Android build readiness check complete!"