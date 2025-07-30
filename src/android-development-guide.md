# Android Native App Development with Local Ollama Deployment

This guide explains how to convert your AI Companion Phone web app into a native Android application with local LLM inference using Ollama in Termux.

## Architecture Overview

```
┌─────────────────────────────────────┐
│           Android App               │
├─────────────────────────────────────┤
│  React Native / Capacitor / Ionic   │
│  ├─ UI Components                   │
│  ├─ Voice Recognition              │
│  ├─ Text-to-Speech                 │
│  └─ HTTP Client                    │
├─────────────────────────────────────┤
│           Native Bridge             │
│  ├─ Termux Integration             │
│  ├─ Process Management             │
│  └─ Local Network Communication    │
├─────────────────────────────────────┤
│              Termux                 │
│  ├─ Linux Environment              │
│  ├─ Ollama Runtime                 │
│  └─ Local LLM Models               │
└─────────────────────────────────────┘
```

## Development Approaches

### Option 1: React Native with Termux Integration (Recommended)

#### Prerequisites
```bash
# Install React Native CLI
npm install -g @react-native-community/cli

# Install Android Studio and SDK
# Download from: https://developer.android.com/studio

# Install Java Development Kit 11 or 17
```

#### Project Setup
```bash
# Initialize React Native project
npx react-native init AICompanionApp --template react-native-template-typescript

# Navigate to project
cd AICompanionApp

# Install dependencies
npm install @react-native-async-storage/async-storage
npm install @react-native-voice/voice
npm install react-native-tts
npm install react-native-fs
npm install react-native-background-job
```

#### Termux Integration Module

Create `android/app/src/main/java/com/aicompanionapp/TermuxModule.java`:

```java
package com.aicompanionapp;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class TermuxModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "TermuxModule";
    private ReactApplicationContext reactContext;

    public TermuxModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void checkTermuxInstalled(Promise promise) {
        try {
            Intent intent = reactContext.getPackageManager()
                .getLaunchIntentForPackage("com.termux");
            promise.resolve(intent != null);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void installTermux(Promise promise) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setData(Uri.parse("https://f-droid.org/packages/com.termux/"));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("INSTALL_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void startOllama(Promise promise) {
        try {
            Intent intent = new Intent();
            intent.setClassName("com.termux", "com.termux.app.TermuxActivity");
            intent.putExtra("com.termux.RUN_COMMAND_PATH", "/data/data/com.termux/files/usr/bin/ollama");
            intent.putExtra("com.termux.RUN_COMMAND_ARGUMENTS", new String[]{"serve"});
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("START_ERROR", e.getMessage());
        }
    }
}
```

#### React Native Bridge Setup

Create `src/services/TermuxService.ts`:

```typescript
import { NativeModules } from 'react-native';

interface TermuxModuleInterface {
  checkTermuxInstalled(): Promise<boolean>;
  installTermux(): Promise<boolean>;
  startOllama(): Promise<boolean>;
}

const { TermuxModule } = NativeModules;

export class TermuxService implements TermuxModuleInterface {
  async checkTermuxInstalled(): Promise<boolean> {
    return await TermuxModule.checkTermuxInstalled();
  }

  async installTermux(): Promise<boolean> {
    return await TermuxModule.installTermux();
  }

  async startOllama(): Promise<boolean> {
    return await TermuxModule.startOllama();
  }

  async checkOllamaStatus(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async sendMessage(message: string, model: string = 'llama3.2:1b'): Promise<string> {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: message,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Ollama API request failed');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      throw new Error(`Failed to get AI response: ${error.message}`);
    }
  }
}

export const termuxService = new TermuxService();
```

### Option 2: Capacitor with Ionic Framework

#### Setup Capacitor Project
```bash
# Install Ionic CLI
npm install -g @ionic/cli

# Create new Ionic project
ionic start ai-companion-app tabs --type=react --capacitor

# Add Capacitor platforms
ionic capacitor add android

# Install plugins
npm install @capacitor/voice-recorder
npm install @capacitor/text-to-speech
npm install @capacitor/filesystem
npm install @capacitor/app
```

#### Capacitor Plugin for Termux

Create `android/app/src/main/java/io/ionic/starter/TermuxPlugin.java`:

```java
package io.ionic.starter;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.content.Intent;
import android.content.pm.PackageManager;

@CapacitorPlugin(name = "TermuxPlugin")
public class TermuxPlugin extends Plugin {

    @PluginMethod
    public void checkTermuxInstalled(PluginCall call) {
        try {
            PackageManager pm = getActivity().getPackageManager();
            pm.getPackageInfo("com.termux", PackageManager.GET_ACTIVITIES);
            call.resolve(JSObject.fromJSONObject(new JSONObject().put("installed", true)));
        } catch (PackageManager.NameNotFoundException e) {
            call.resolve(JSObject.fromJSONObject(new JSONObject().put("installed", false)));
        }
    }

    @PluginMethod
    public void startOllamaService(PluginCall call) {
        try {
            Intent intent = new Intent();
            intent.setClassName("com.termux", "com.termux.app.TermuxActivity");
            intent.putExtra("com.termux.RUN_COMMAND_PATH", "/data/data/com.termux/files/usr/bin/ollama");
            intent.putExtra("com.termux.RUN_COMMAND_ARGUMENTS", new String[]{"serve", "--host", "0.0.0.0"});
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to start Ollama", e);
        }
    }
}
```

## Termux Setup Instructions

### 1. Install Termux
```bash
# Download from F-Droid (recommended) or GitHub releases
# F-Droid: https://f-droid.org/packages/com.termux/
# GitHub: https://github.com/termux/termux-app/releases
```

### 2. Setup Termux Environment
```bash
# Update packages
pkg update && pkg upgrade -y

# Install required packages
pkg install curl wget git python nodejs-lts

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Download a lightweight model suitable for mobile
ollama pull llama3.2:1b
# or for better performance on higher-end devices:
ollama pull phi3:mini
```

### 3. Configure Ollama for Network Access
```bash
# Create Ollama systemd service for Termux
mkdir -p ~/.config/systemd/user

# Create service file
cat > ~/.config/systemd/user/ollama.service << EOF
[Unit]
Description=Ollama Service
After=network.target

[Service]
Type=simple
Environment=OLLAMA_HOST=0.0.0.0:11434
ExecStart=/data/data/com.termux/files/usr/bin/ollama serve
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
EOF

# Enable and start service
systemctl --user daemon-reload
systemctl --user enable ollama
systemctl --user start ollama
```

### 4. Auto-start Configuration

Create `~/.bashrc` addition:
```bash
# Auto-start Ollama if not running
if ! pgrep -f "ollama serve" > /dev/null; then
    echo "Starting Ollama..."
    OLLAMA_HOST=0.0.0.0:11434 ollama serve &
    echo "Ollama started on http://localhost:11434"
fi
```

## AI Companion Integration

### Voice Processing Component
```typescript
import React, { useState, useEffect } from 'react';
import { termuxService } from '../services/TermuxService';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';

export const AICompanionNative: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ollamaReady, setOllamaReady] = useState(false);
  const [currentPersonality, setCurrentPersonality] = useState('friendly');

  useEffect(() => {
    initializeServices();
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechEnd = () => setIsListening(false);
    
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const initializeServices = async () => {
    // Check Termux installation
    const termuxInstalled = await termuxService.checkTermuxInstalled();
    if (!termuxInstalled) {
      await termuxService.installTermux();
      return;
    }

    // Check Ollama status
    const ollamaStatus = await termuxService.checkOllamaStatus();
    if (!ollamaStatus) {
      await termuxService.startOllama();
      // Wait and check again
      setTimeout(async () => {
        const status = await termuxService.checkOllamaStatus();
        setOllamaReady(status);
      }, 5000);
    } else {
      setOllamaReady(true);
    }

    // Configure TTS for British English
    Tts.setDefaultLanguage('en-GB');
    Tts.setDefaultRate(0.8); // Slower for kids
    Tts.setDefaultPitch(1.2); // Higher pitch for friendliness
  };

  const onSpeechResults = async (event: any) => {
    const transcript = event.value[0];
    if (transcript && ollamaReady) {
      await handleUserMessage(transcript);
    }
  };

  const handleUserMessage = async (message: string) => {
    try {
      setIsSpeaking(true);
      
      // Generate personality-aware prompt
      const personalityPrompt = getPersonalityPrompt(currentPersonality, message);
      
      // Get AI response
      const response = await termuxService.sendMessage(personalityPrompt);
      
      // Speak the response
      await Tts.speak(response);
      
    } catch (error) {
      console.error('Error handling message:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const getPersonalityPrompt = (personality: string, message: string): string => {
    const personalities = {
      friendly: "You are a cheerful, encouraging friend talking to a 4-year-old. Keep responses short, positive, and engaging.",
      educational: "You are a patient teacher helping a curious 4-year-old learn. Explain things simply with examples they understand.",
      playful: "You are a fun, silly friend who loves to play games and be imaginative with a 4-year-old.",
      calming: "You are a gentle, soothing voice helping a 4-year-old feel calm and secure."
    };

    return `${personalities[personality]} Child says: "${message}". Respond warmly in 1-2 sentences.`;
  };

  const startListening = async () => {
    try {
      setIsListening(true);
      await Voice.start('en-GB'); // British English
    } catch (error) {
      console.error('Voice recognition error:', error);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Your existing UI components adapted for React Native */}
      {/* Status indicators, personality selector, call buttons, etc. */}
    </View>
  );
};
```

## Model Recommendations for Mobile

### Lightweight Models (< 2GB RAM)
- `llama3.2:1b` - 1.3GB, good for basic conversations
- `phi3:mini` - 2.3GB, better reasoning
- `tinyllama:1.1b` - 637MB, very fast but limited

### Medium Models (4GB+ RAM)
- `llama3.2:3b` - 2.0GB, good balance
- `phi3:medium` - 7.9GB, excellent quality

### Performance Optimization
```bash
# In Termux, set model-specific parameters
ollama run llama3.2:1b --num-ctx 2048 --num-predict 128
```

## Build and Deployment

### React Native Build
```bash
# Generate APK
cd android
./gradlew assembleRelease

# Generated APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

### Ionic Capacitor Build
```bash
# Build and sync
ionic build
ionic capacitor sync android

# Open in Android Studio
ionic capacitor open android

# Or build directly
ionic capacitor build android
```

## Troubleshooting

### Common Issues

1. **Ollama not starting in Termux**
   ```bash
   # Check if Ollama is installed
   which ollama
   
   # Check running processes
   pgrep -f ollama
   
   # Restart Termux and try again
   ```

2. **Network connection issues**
   ```bash
   # Test Ollama API
   curl http://localhost:11434/api/tags
   
   # Check if port is open
   netstat -tlnp | grep 11434
   ```

3. **Permission issues**
   ```bash
   # Grant storage permissions in Android settings
   # Enable "Allow modification of system settings" for Termux
   ```

### Performance Tips

1. **Battery Optimization**: Disable battery optimization for both your app and Termux
2. **Memory Management**: Use smaller models on devices with < 4GB RAM
3. **Background Processing**: Use foreground services to keep Ollama running
4. **Model Caching**: Pre-load models during app installation

## Security Considerations

- Local inference ensures privacy (no data sent to external servers)
- Restrict network access to localhost only
- Implement app sandboxing for child safety
- Regular model updates for safety improvements
- Parental controls for personality selection

This architecture provides a fully offline AI companion that runs locally on Android devices while maintaining the child-friendly interface and functionality of your web application.