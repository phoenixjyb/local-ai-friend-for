#!/bin/bash

# Android Platform Setup and First Build Script
# This script sets up the Android platform and builds the first APK

echo "🚀 Setting up Android platform for AI Companion Phone..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if project has the right structure
if [ ! -f "capacitor.config.ts" ]; then
    print_error "capacitor.config.ts not found. Are you in the right directory?"
    exit 1
fi

if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the right directory?"
    exit 1
fi

print_status "Project structure validated ✓"

# Check if Node.js and npm are available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "NPM is not installed. Please install Node.js with NPM first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_warning "Node.js version $NODE_VERSION detected. Node.js 18+ is recommended."
fi

print_success "Node.js $(node --version) detected ✓"

# Install dependencies if node_modules doesn't exist or is incomplete
if [ ! -d "node_modules" ] || [ ! -f "node_modules/@capacitor/cli/package.json" ]; then
    print_status "Installing project dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies!"
        exit 1
    fi
    print_success "Dependencies installed ✓"
else
    print_success "Dependencies already installed ✓"
fi

# Check if Capacitor CLI is available
if ! npx cap --version &> /dev/null; then
    print_error "Capacitor CLI not available. Installing..."
    npm install @capacitor/cli@latest
fi

print_success "Capacitor CLI available ✓"

# Build the web app first
print_status "Building web application..."
npm run build

if [ ! -d "dist" ]; then
    print_error "Web build failed - dist directory not created!"
    exit 1
fi

print_success "Web application built ✓"

# Check if Android platform already exists
if [ -d "android" ]; then
    print_warning "Android platform already exists. Syncing instead..."
    npx cap sync android
    print_success "Android platform synced ✓"
else
    print_status "Adding Android platform..."
    npx cap add android
    
    if [ ! -d "android" ]; then
        print_error "Failed to add Android platform!"
        exit 1
    fi
    
    print_success "Android platform added ✓"
    
    print_status "Syncing web app with Android platform..."
    npx cap sync android
    print_success "Platform synced ✓"
fi

# Check for Android development environment
print_status "Checking Android development environment..."

JAVA_VERSION=""
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
    if [ "$JAVA_VERSION" -ge 17 ] 2>/dev/null; then
        print_success "Java $JAVA_VERSION detected ✓"
        JAVA_READY=true
    else
        print_warning "Java $JAVA_VERSION detected, but Java 17+ is recommended"
        JAVA_READY=false
    fi
else
    print_warning "Java not detected. Java 17+ required for building APK"
    JAVA_READY=false
fi

# Check for Android SDK
ANDROID_HOME=${ANDROID_HOME:-$ANDROID_SDK_ROOT}
if [ -n "$ANDROID_HOME" ] && [ -d "$ANDROID_HOME" ]; then
    print_success "Android SDK detected at $ANDROID_HOME ✓"
    SDK_READY=true
else
    print_warning "ANDROID_HOME not set or Android SDK not found"
    SDK_READY=false
fi

# Attempt to build APK if environment is ready
if [ "$JAVA_READY" = true ] && [ "$SDK_READY" = true ]; then
    print_status "Environment ready! Attempting to build APK..."
    
    cd android
    
    # Try to build the APK
    if ./gradlew assembleRelease; then
        cd ..
        
        # Check if APK was created
        APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
        if [ -f "$APK_PATH" ]; then
            APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
            
            # Create a better named APK
            TIMESTAMP=$(date +%Y%m%d_%H%M%S)
            NEW_APK_NAME="AI-Companion-Phone-v${TIMESTAMP}.apk"
            cp "$APK_PATH" "$NEW_APK_NAME"
            
            print_success "APK built successfully! 🎉"
            echo ""
            echo "📱 APK Details:"
            echo "   File: $NEW_APK_NAME"
            echo "   Size: $APK_SIZE"
            echo ""
            echo "📋 Installation on Samsung Galaxy S24 Ultra:"
            echo "   1. Transfer $NEW_APK_NAME to your device"
            echo "   2. Settings > Apps > Special access > Install unknown apps"
            echo "   3. Enable installation for your file manager"
            echo "   4. Tap the APK file to install"
            echo "   5. Grant microphone permission when prompted"
            echo ""
            echo "🧠 For Local LLM (Offline AI):"
            echo "   1. Install Termux from Google Play Store"
            echo "   2. Follow ANDROID_SETUP.md for Ollama setup"
            echo "   3. Recommended model: gemma2:2b (perfect for S24 Ultra)"
            echo ""
        else
            print_error "APK file not found after build!"
        fi
    else
        cd ..
        print_error "APK build failed! Check gradle output above."
        echo ""
        print_status "You can try building manually with:"
        echo "   cd android && ./gradlew assembleRelease"
    fi
    
elif [ "$JAVA_READY" = false ]; then
    print_warning "Cannot build APK without Java 17+. Please install Java Development Kit."
    echo ""
    echo "📋 To install Java 17:"
    echo "   Ubuntu/Debian: sudo apt install openjdk-17-jdk"
    echo "   macOS: brew install openjdk@17"
    echo "   Windows: Download from https://adoptium.net/"
    echo ""
    echo "After installing Java, run this script again to build the APK."
    
elif [ "$SDK_READY" = false ]; then
    print_warning "Cannot build APK without Android SDK. Please install Android Studio or command line tools."
    echo ""
    echo "📋 To install Android SDK:"
    echo "   1. Download Android Studio from https://developer.android.com/studio"
    echo "   2. Install and open Android Studio"
    echo "   3. Go to Tools > SDK Manager"
    echo "   4. Install Android SDK Platform-Tools and Build-Tools"
    echo "   5. Set ANDROID_HOME environment variable"
    echo ""
    echo "Alternative: Install command line tools only"
    echo "   Download from https://developer.android.com/studio#command-tools"
    echo ""
    echo "After setting up Android SDK, run this script again to build the APK."
fi

echo ""
print_success "Android platform setup complete! ✓"
echo ""
echo "🎯 Next Steps:"
echo "   1. If APK was built: Install it on your Samsung S24 Ultra"
echo "   2. If build failed: Install Java 17+ and Android SDK"
echo "   3. For optimized builds: Use ./build-s24-apk.sh"
echo "   4. For development: Use 'npx cap open android'"
echo ""
echo "📚 Available Documentation:"
echo "   • ANDROID_SETUP.md - Local LLM setup with Ollama"
echo "   • GALAXY_S24_OPTIMIZATION.md - Device-specific features"
echo "   • ANDROID_READINESS_CHECKLIST.md - Complete readiness status"