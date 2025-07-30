import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.aicompanion.phone',
  appName: 'AI Companion Phone',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    // Samsung Galaxy S24 Ultra optimizations
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
      signingType: 'jarsigner'
    },
    // Optimize for high-end devices like S24 Ultra
    webContentsDebuggingEnabled: false, // Disable for production
    allowMixedContent: false,
    captureInput: true,
    // Hardware acceleration for smooth animations
    hardwareAccelerated: true,
    // Enable S Pen support if needed
    allowBackup: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500, // Faster on S24 Ultra
      backgroundColor: '#f7f0e8',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#f7f0e8'
    },
    // Optimize keyboard handling for large screen
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
    // Enhanced haptics for premium feel
    Haptics: {
      // Enable rich haptic feedback
    },
    // Audio optimization for voice chat
    Device: {
      // Device info for optimization
    }
  }
};

export default config;
