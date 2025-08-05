import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.aicompanion.phone',
  appName: 'AI Friend',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    // Samsung Galaxy S24 Ultra optimizations with WebView 138.0+ compatibility
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
      signingType: 'jarsigner'
    },
    // WebView 138.0+ compatibility settings
    webContentsDebuggingEnabled: false, // Disable for production
    allowMixedContent: false,
    captureInput: true,
    // Hardware acceleration for smooth animations and audio visualization
    hardwareAccelerated: true,
    // Enable S Pen support for drawing features
    allowBackup: true,
    // Audio optimizations
    useLegacyBridge: false,
    // WebView 138.0+ specific compatibility
    clearTextTrafficPermitted: true, // Required for HTTP Ollama connections
    webViewLoaderForAndroid11: false, // Use default WebView loader
    mixedContentMode: 'MIXED_CONTENT_COMPATIBILITY_MODE'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000, // Show cute splash longer for kids
      backgroundColor: '#f7f0e8', // Warm background matching theme
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#f7f0e8' // Warm theme color
    },
    // Optimize keyboard handling for large screen drawing
    Keyboard: {
      resize: 'ionic',
      style: 'light',
      resizeOnFullScreen: true
    },
    // High-quality camera access for drawing feature
    Camera: {
      resultType: 'dataUrl',
      quality: 90, // High quality for S24 Ultra camera
      allowEditing: true,
      saveToGallery: false
    },
    // Enhanced haptics for premium feel on S24 Ultra
    Haptics: {
      // Enable rich haptic feedback for button presses and voice interactions
    },
    // Device info for Samsung optimizations
    Device: {
      // Device detection for S24 Ultra specific features
    },
    // Speech Recognition for voice chat
    SpeechRecognition: {
      // Voice input configuration
    },
    // Text-to-Speech for AI responses
    TextToSpeech: {
      // British English voice output
    },
    // App state for background conversation
    App: {
      // Handle app state changes during voice chat
    },
    // Audio focus management
    NativeAudio: {
      // Optimize audio playback for voice responses
    }
  }
};

export default config;
