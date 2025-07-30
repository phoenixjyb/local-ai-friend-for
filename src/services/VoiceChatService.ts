import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Device } from '@capacitor/device';

export class VoiceChatService {
  private isListening = false;
  private isSpeaking = false;
  private isInitialized = false;
  private deviceInfo: any = null;

  async initializeVoiceServices() {
    if (this.isInitialized || !Capacitor.isNativePlatform()) return;
    
    try {
      // Get device info for optimization
      this.deviceInfo = await Device.getInfo();
      console.log('Device info:', this.deviceInfo);
      
      // Request permissions for speech recognition
      const permissions = await SpeechRecognition.requestPermissions();
      console.log('Speech permissions:', permissions);
      
      // Samsung S24 Ultra specific optimizations
      const isSamsung = this.deviceInfo.manufacturer?.toLowerCase().includes('samsung');
      const isHighEnd = this.deviceInfo.memUsed ? parseInt(this.deviceInfo.memUsed) > 8000000000 : false; // >8GB RAM
      
      // Optimize TTS for Samsung devices
      const ttsSettings = isSamsung && isHighEnd ? {
        lang: 'en-GB',
        rate: 0.85, // Slightly faster for powerful device
        pitch: 1.3,  // Higher pitch for child-friendly voice
        volume: 0.05, // Very quiet test
        category: 'ambient'
      } : {
        lang: 'en-GB',
        rate: 0.8,
        pitch: 1.2,
        volume: 0.05,
        category: 'ambient'
      };
      
      // Test TTS initialization with optimized settings
      await TextToSpeech.speak({
        text: " ", // Silent test
        ...ttsSettings
      });
      
      // Initialize haptics for premium feel (S24 Ultra has excellent haptics)
      if (isSamsung) {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
      
      this.isInitialized = true;
      console.log('Voice services initialized successfully for', this.deviceInfo.model);
    } catch (error) {
      console.error('Error initializing voice services:', error);
    }
  }

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
      // Samsung S24 Ultra has excellent noise cancellation - optimize for it
      const isSamsung = this.deviceInfo?.manufacturer?.toLowerCase().includes('samsung');
      
      const result = await SpeechRecognition.start({
        language: 'en-GB',
        maxResults: isSamsung ? 3 : 1, // More results on Samsung for better accuracy
        prompt: 'Say something to your AI friend!',
        partialResults: isSamsung, // Enable partial results on Samsung for responsiveness
        popup: false
      });

      this.isListening = false;
      
      if (result.matches && result.matches.length > 0) {
        console.log('Speech recognized:', result.matches[0]);
        // Success haptic feedback
        try {
          await Haptics.impact({ style: ImpactStyle.Medium });
        } catch (e) { /* Haptics not available */ }
        return result.matches[0];
      }
    } catch (error) {
      this.isListening = false;
      console.error('Speech recognition error:', error);
      // Error haptic feedback
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (e) { /* Haptics not available */ }
    }
    
    return '';
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