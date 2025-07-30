import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';

export class VoiceChatService {
  private isListening = false;
  private isSpeaking = false;
  private isInitialized = false;

  async initializeVoiceServices() {
    if (this.isInitialized || !Capacitor.isNativePlatform()) return;
    
    try {
      // Request permissions for speech recognition
      const permissions = await SpeechRecognition.requestPermissions();
      console.log('Speech permissions:', permissions);
      
      // Test TTS initialization
      await TextToSpeech.speak({
        text: " ", // Silent test
        lang: 'en-GB',
        rate: 0.8,
        pitch: 1.2,
        volume: 0.1, // Very quiet test
        category: 'ambient'
      });
      
      this.isInitialized = true;
      console.log('Voice services initialized successfully');
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
    
    try {
      const result = await SpeechRecognition.start({
        language: 'en-GB',
        maxResults: 1,
        prompt: 'Say something to your AI friend!',
        partialResults: false,
        popup: false
      });

      this.isListening = false;
      
      if (result.matches && result.matches.length > 0) {
        console.log('Speech recognized:', result.matches[0]);
        return result.matches[0];
      }
    } catch (error) {
      this.isListening = false;
      console.error('Speech recognition error:', error);
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

    // Adjust voice based on personality
    const voiceSettings = this.getVoiceSettings(personality);

    try {
      await TextToSpeech.speak({
        text: text,
        lang: 'en-GB',
        rate: voiceSettings.rate,
        pitch: voiceSettings.pitch,
        volume: 1.0,
        category: 'ambient'
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
    const settings = {
      friendly: { rate: 0.8, pitch: 1.2 },
      educational: { rate: 0.7, pitch: 1.0 },
      playful: { rate: 0.9, pitch: 1.4 },
      calming: { rate: 0.6, pitch: 0.9 }
    };
    return settings[personality] || settings.friendly;
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