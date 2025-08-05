import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Device } from '@capacitor/device';

export interface VoiceOptimizations {
  isSamsungS24Ultra: boolean;
  hasAdvancedHaptics: boolean;
  supportsBixbyASR: boolean;
  memoryCapacity: number;
  processorType: string;
}

export class VoiceChatService {
  private isListening = false;
  private isSpeaking = false;
  private isInitialized = false;
  private deviceInfo: any = null;
  private voiceOptimizations: VoiceOptimizations | null = null;

  async initializeVoiceServices() {
    if (this.isInitialized || !Capacitor.isNativePlatform()) return;
    
    try {
      // Get device info for optimization
      this.deviceInfo = await Device.getInfo();
      console.log('🔍 Detecting device capabilities:', this.deviceInfo);
      
      // Analyze device for Samsung S24 Ultra optimizations
      this.voiceOptimizations = this.analyzeDeviceCapabilities(this.deviceInfo);
      
      // Request permissions for speech recognition
      const permissions = await SpeechRecognition.requestPermissions();
      console.log('🎤 Speech permissions:', permissions);
      
      // Configure TTS with device-specific optimizations
      const ttsSettings = this.getOptimizedTTSSettings();
      
      // Test TTS initialization with optimized settings
      await TextToSpeech.speak({
        text: " ", // Silent test
        ...ttsSettings
      });
      
      // Initialize haptics with device-specific settings
      if (this.voiceOptimizations.hasAdvancedHaptics) {
        console.log('🎮 Advanced haptics available (S24 Ultra detected)')
        await Haptics.impact({ style: ImpactStyle.Light });
      }
      
      console.log('✅ Voice services optimized for:', this.voiceOptimizations);
      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ Voice service initialization failed:', error);
      throw error;
    }
  }

  private analyzeDeviceCapabilities(deviceInfo: any): VoiceOptimizations {
    const manufacturer = deviceInfo.manufacturer?.toLowerCase() || '';
    const model = deviceInfo.model?.toLowerCase() || '';
    const memUsed = deviceInfo.memUsed ? parseInt(deviceInfo.memUsed) : 0;
    
    // Detect Samsung S24 Ultra specifically
    const isSamsungS24Ultra = manufacturer.includes('samsung') && 
                             (model.includes('s24') || model.includes('sm-s928'));
    
    // Advanced capabilities detection
    const hasAdvancedHaptics = isSamsungS24Ultra || memUsed > 8000000000; // >8GB RAM
    const supportsBixbyASR = manufacturer.includes('samsung');
    const memoryCapacity = isSamsungS24Ultra ? 12 : Math.floor(memUsed / 1000000000); // GB
    const processorType = isSamsungS24Ultra ? 'Snapdragon 8 Gen 3' : 'Standard';
    
    return {
      isSamsungS24Ultra,
      hasAdvancedHaptics,
      supportsBixbyASR,
      memoryCapacity,
      processorType
    };
  }

  private getOptimizedTTSSettings() {
    if (!this.voiceOptimizations) {
      // Fallback settings
      return {
        lang: 'en-GB',
        rate: 0.8,
        pitch: 1.2,
        volume: 0.05,
        category: 'ambient'
      };
    }

    if (this.voiceOptimizations.isSamsungS24Ultra) {
      // Samsung S24 Ultra optimized settings
      return {
        lang: 'en-GB',
        rate: 0.85,        // Slightly faster for powerful device
        pitch: 1.3,        // Higher pitch for child-friendly voice
        volume: 0.05,      // Test volume
        category: 'ambient'
        // Note: Samsung TTS voice selection handled separately
      };
    }

    // High-end device settings
    if (this.voiceOptimizations.memoryCapacity >= 8) {
      return {
        lang: 'en-GB',
        rate: 0.83,
        pitch: 1.25,
        volume: 0.05,
        category: 'ambient'
      };
    }

    // Standard device settings
    return {
      lang: 'en-GB',
      rate: 0.8,
      pitch: 1.2,
      volume: 0.05,
      category: 'ambient'
    };
  }
  
  // Enhanced listening method with Samsung S24 Ultra optimizations
  async startListening(): Promise<string> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Not on native platform, skipping voice recognition');
      return '';
    }

    if (this.isListening) return '';
    
    this.isListening = true;
    
    // Haptic feedback for starting to listen (S24 Ultra optimization)
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) { /* Haptics not available */ }
    
    try {
      // Samsung S24 Ultra has excellent noise cancellation and processing power
      const isSamsung = this.deviceInfo?.manufacturer?.toLowerCase().includes('samsung');
      const isSamsungS24Ultra = this.voiceOptimizations?.isSamsungS24Ultra || false;
      
      console.log('🎤 Starting ASR with Samsung S24 Ultra optimizations:', {
        isSamsung,
        isSamsungS24Ultra,
        hasAdvancedHaptics: this.voiceOptimizations?.hasAdvancedHaptics,
        supportsBixbyASR: this.voiceOptimizations?.supportsBixbyASR
      });

      const result = await SpeechRecognition.start({
        language: 'en-GB',
        maxResults: isSamsungS24Ultra ? 5 : (isSamsung ? 3 : 1), // More results on S24 Ultra
        prompt: 'Tell your AI friend something!',
        partialResults: isSamsungS24Ultra, // Enable streaming on S24 Ultra
        popup: false,
        // Samsung-specific optimizations
        ...(isSamsungS24Ultra && {
          showProgressDialog: false, // S24 Ultra can handle without UI
          androidSpeechExtras: {
            'EXTRA_CONFIDENCE_THRESHOLD': 0.7, // Lower threshold for better responsiveness
            'EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS': 1500, // Faster timeout
            'EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS': 1500,
            'EXTRA_PREFER_OFFLINE': true // Use offline ASR when possible
          }
        })
      });

      this.isListening = false;
      
      if (result.matches && result.matches.length > 0) {
        const bestMatch = this.selectBestTranscript(result.matches, isSamsungS24Ultra);
        console.log('🎯 Speech recognized (best match):', bestMatch);
        console.log('📝 All matches for comparison:', result.matches);
        
        // Success haptic feedback with S24 Ultra enhancement
        try {
          await Haptics.impact({ 
            style: isSamsungS24Ultra ? ImpactStyle.Medium : ImpactStyle.Light 
          });
        } catch (e) { /* Haptics not available */ }
        
        return bestMatch;
      }
    } catch (error) {
      this.isListening = false;
      console.error('❌ Speech recognition error:', error);
      // Error haptic feedback
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (e) { /* Haptics not available */ }
    }
    
    return '';
  }

  // Enhanced transcript selection for Samsung S24 Ultra's multi-result ASR
  private selectBestTranscript(matches: string[], isSamsungS24Ultra: boolean): string {
    if (!matches || matches.length === 0) return '';
    
    // On S24 Ultra, we can use more sophisticated selection
    if (isSamsungS24Ultra && matches.length > 1) {
      // Prefer longer, more complete sentences
      const sortedByLength = matches.sort((a, b) => b.length - a.length);
      
      // Filter out very short responses that might be partial
      const substantialMatches = sortedByLength.filter(match => 
        match.trim().length >= 3 && 
        !match.toLowerCase().includes('hmm') &&
        !match.toLowerCase().includes('uh')
      );
      
      if (substantialMatches.length > 0) {
        console.log('🧠 S24 Ultra: Selected substantial match:', substantialMatches[0]);
        return substantialMatches[0];
      }
    }
    
    // Default: return first match
    return matches[0];
  }

  async speak(text: string, personality: string = 'friendly'): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Not on native platform, skipping TTS');
      return;
    }

    if (this.isSpeaking) {
      await this.stopSpeaking();
    }

    this.isSpeaking = true;

    // Adjust voice based on personality and device capabilities
    const voiceSettings = this.getVoiceSettings(personality);
    
    // Samsung S24 Ultra audio optimization
    const isSamsung = this.deviceInfo?.manufacturer?.toLowerCase().includes('samsung');
    const optimizedSettings = isSamsung ? {
      ...voiceSettings,
      volume: 0.95, // Use high volume for Samsung's excellent speakers
      category: 'ambient'
    } : {
      ...voiceSettings,
      volume: 1.0,
      category: 'ambient'
    };

    try {
      await TextToSpeech.speak({
        text: text,
        lang: 'en-GB',
        rate: optimizedSettings.rate,
        pitch: optimizedSettings.pitch,
        volume: optimizedSettings.volume,
        category: optimizedSettings.category
      });
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      this.isSpeaking = false;
    }
  }

  async stopSpeaking(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      await TextToSpeech.stop();
      this.isSpeaking = false;
    } catch (error) {
      console.error('Error stopping TTS:', error);
    }
  }

  async stopListening(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    
    if (this.isListening) {
      try {
        await SpeechRecognition.stop();
        this.isListening = false;
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
  }

  private getVoiceSettings(personality: string) {
    // Optimize voice settings for Samsung S24 Ultra's audio capabilities
    const isSamsung = this.deviceInfo?.manufacturer?.toLowerCase().includes('samsung');
    const highEndMultiplier = isSamsung ? 1.1 : 1.0; // Slightly enhanced for premium devices
    
    const settings = {
      friendly: { 
        rate: 0.8 * highEndMultiplier, 
        pitch: 1.2 * highEndMultiplier 
      },
      educational: { 
        rate: 0.7 * highEndMultiplier, 
        pitch: 1.0 * highEndMultiplier 
      },
      playful: { 
        rate: 0.9 * highEndMultiplier, 
        pitch: 1.4 * highEndMultiplier 
      },
      calming: { 
        rate: 0.6 * highEndMultiplier, 
        pitch: 0.9 * highEndMultiplier 
      }
    };
    return settings[personality] || settings.friendly;
  }

  getDeviceInfo() {
    return this.deviceInfo;
  }

  isSamsungDevice(): boolean {
    return this.deviceInfo?.manufacturer?.toLowerCase().includes('samsung') || false;
  }

  isHighEndDevice(): boolean {
    // Check if device has >8GB RAM (like S24 Ultra)
    return this.deviceInfo?.memUsed ? parseInt(this.deviceInfo.memUsed) > 8000000000 : false;
  }

  getListeningState(): boolean {
    return this.isListening;
  }

  getSpeakingState(): boolean {
    return this.isSpeaking;
  }

  isNativeVoiceAvailable(): boolean {
    return Capacitor.isNativePlatform() && this.isInitialized;
  }
}

export const voiceChatService = new VoiceChatService();