/**
 * Sound Effects Service for Child-Friendly AI Companion
 * Provides cute sound effects and audio feedback for better engagement
 */

export type SoundType = 
  | 'button-tap' 
  | 'call-start' 
  | 'call-end' 
  | 'ai-thinking' 
  | 'success-chime' 
  | 'error-boop' 
  | 'magic-sparkle'
  | 'drawing-brush'
  | 'personality-switch'
  | 'heart-beat'
  | 'whoosh'
  | 'pop'

class SoundEffectsService {
  private audioContext: AudioContext | null = null
  private sounds: Map<SoundType, AudioBuffer> = new Map()
  private isEnabled = true

  constructor() {
    // Don't initialize anything in constructor to avoid autoplay policy violations
    // Initialize lazily when first sound is played
  }

  private initializeAudioContext() {
    // Don't create AudioContext until first user interaction
    // This prevents browser console errors about autoplay policy
    return
  }

  private ensureAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        // Resume context if it's suspended (required by autoplay policy)
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume()
        }
      } catch (error) {
        console.warn('Audio context not supported:', error)
        return null
      }
    }
    return this.audioContext
  }

  /**
   * Generate cute sound effects using Web Audio API
   */
  private async generateSounds() {
    const audioContext = this.ensureAudioContext()
    if (!audioContext) {
      console.warn('Audio context not available, skipping sound generation')
      return
    }

    try {
      // Button tap - cute pop sound
      const buttonTap = this.createPopSound()
      if (buttonTap) this.sounds.set('button-tap', buttonTap)
      
      // Call start - ascending chime
      const callStart = this.createChimeSound(true)
      if (callStart) this.sounds.set('call-start', callStart)
      
      // Call end - descending chime
      const callEnd = this.createChimeSound(false)
      if (callEnd) this.sounds.set('call-end', callEnd)
      
      // AI thinking - soft bubbling
      const aiThinking = this.createBubbleSound()
      if (aiThinking) this.sounds.set('ai-thinking', aiThinking)
      
      // Success - happy chime
      const success = this.createSuccessSound()
      if (success) this.sounds.set('success-chime', success)
      
      // Error - gentle boop
      const error = this.createErrorSound()
      if (error) this.sounds.set('error-boop', error)
      
      // Magic sparkle - twinkling
      const sparkle = this.createSparkleSound()
      if (sparkle) this.sounds.set('magic-sparkle', sparkle)
      
      // Drawing brush - soft brush stroke
      const brush = this.createBrushSound()
      if (brush) this.sounds.set('drawing-brush', brush)
      
      // Personality switch - whoosh
      const personalitySwitch = this.createWhooshSound()
      if (personalitySwitch) this.sounds.set('personality-switch', personalitySwitch)
      
      // Heart beat - gentle thump
      const heartBeat = this.createHeartSound()
      if (heartBeat) this.sounds.set('heart-beat', heartBeat)
      
      // Whoosh - air movement
      const whoosh = this.createWhooshSound()
      if (whoosh) this.sounds.set('whoosh', whoosh)
      
      // Pop - bubble pop
      const pop = this.createPopSound()
      if (pop) this.sounds.set('pop', pop)
      
      console.log(`✅ Generated ${this.sounds.size} sound effects`)
    } catch (error) {
      console.warn('Failed to generate sound effects:', error)
    }
  }

  private createPopSound(): AudioBuffer | null {
    const audioContext = this.ensureAudioContext()
    if (!audioContext) {
      console.warn('Cannot create pop sound: no audio context')
      return null
    }
    
    try {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate)
      const data = buffer.getChannelData(0)
      
      for (let i = 0; i < data.length; i++) {
        const t = i / audioContext.sampleRate
        // Quick pop with envelope
        data[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 20) * 0.3
      }
      
      return buffer
    } catch (error) {
      console.warn('Failed to create pop sound:', error)
      return null
    }
  }

  private createChimeSound(ascending: boolean): AudioBuffer | null {
    const audioContext = this.ensureAudioContext()
    if (!audioContext) {
      console.warn('Cannot create chime sound: no audio context')
      return null
    }
    
    try {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.8, audioContext.sampleRate)
      const data = buffer.getChannelData(0)
      
      const frequencies = ascending ? [440, 550, 660, 770] : [770, 660, 550, 440]
      const noteLength = data.length / frequencies.length
      
      for (let note = 0; note < frequencies.length; note++) {
        const startIdx = Math.floor(note * noteLength)
        const endIdx = Math.floor((note + 1) * noteLength)
        
        for (let i = startIdx; i < endIdx; i++) {
          const t = (i - startIdx) / audioContext.sampleRate
          const envelope = Math.exp(-t * 3) * (1 - t / (noteLength / audioContext.sampleRate))
          data[i] = Math.sin(2 * Math.PI * frequencies[note] * t) * envelope * 0.2
        }
      }
      
      return buffer
    } catch (error) {
      console.warn('Failed to create chime sound:', error)
      return null
    }
  }

  private createBubbleSound(): AudioBuffer | null {
    const audioContext = this.ensureAudioContext()
    if (!audioContext) {
      console.warn('Cannot create bubble sound: no audio context')
      return null
    }
    
    try {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.5, audioContext.sampleRate)
      const data = buffer.getChannelData(0)
      
      for (let i = 0; i < data.length; i++) {
        const t = i / audioContext.sampleRate
        // Bubbling effect with multiple frequencies
        const bubble1 = Math.sin(2 * Math.PI * 200 * t) * Math.sin(2 * Math.PI * 5 * t)
        const bubble2 = Math.sin(2 * Math.PI * 300 * t) * Math.sin(2 * Math.PI * 3 * t)
        data[i] = (bubble1 + bubble2) * Math.exp(-t * 2) * 0.15
      }
      
      return buffer
    } catch (error) {
      console.warn('Failed to create bubble sound:', error)
      return null
    }
  }

  private createSuccessSound(): AudioBuffer | null {
    const audioContext = this.ensureAudioContext()
    if (!audioContext) {
      console.warn('Cannot create success sound: no audio context')
      return null
    }
    
    try {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.6, audioContext.sampleRate)
      const data = buffer.getChannelData(0)
      
      // Happy ascending arpeggio
      const frequencies = [523, 659, 784, 1047] // C, E, G, C octave
      const noteLength = data.length / frequencies.length
      
      for (let note = 0; note < frequencies.length; note++) {
        const startIdx = Math.floor(note * noteLength)
        const endIdx = Math.floor((note + 1) * noteLength)
        
        for (let i = startIdx; i < endIdx; i++) {
          const t = (i - startIdx) / audioContext.sampleRate
          const envelope = Math.exp(-t * 4) * Math.sin(Math.PI * t / (noteLength / audioContext.sampleRate))
          data[i] = Math.sin(2 * Math.PI * frequencies[note] * t) * envelope * 0.25
        }
      }
      
      return buffer
    } catch (error) {
      console.warn('Failed to create success sound:', error)
      return null
  }

  private createErrorSound(): AudioBuffer | null {
    const audioContext = this.ensureAudioContext()
    if (!audioContext) {
      console.warn('Cannot create error sound: no audio context')
      return null
    }
    
    try {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.3, audioContext.sampleRate)
      const data = buffer.getChannelData(0)
      
      for (let i = 0; i < data.length; i++) {
        const t = i / audioContext.sampleRate
        // Gentle descending tone
        const frequency = 400 - (t * 100)
        data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 5) * 0.2
      }
      
      return buffer
    } catch (error) {
      console.warn('Failed to create error sound:', error)
      return null
    }
  }

  private createSparkleSound(): AudioBuffer | null {
    const audioContext = this.ensureAudioContext()
    if (!audioContext) {
      console.warn('Cannot create sparkle sound: no audio context')
      return null
    }
    
    try {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.4, audioContext.sampleRate)
      const data = buffer.getChannelData(0)
      
      for (let i = 0; i < data.length; i++) {
        const t = i / audioContext.sampleRate
        // Twinkling with high frequencies
        const sparkle1 = Math.sin(2 * Math.PI * 1200 * t) * Math.random() * 0.5
        const sparkle2 = Math.sin(2 * Math.PI * 1600 * t) * Math.random() * 0.3
        data[i] = (sparkle1 + sparkle2) * Math.exp(-t * 8) * 0.15
      }
      
      return buffer
    } catch (error) {
      console.warn('Failed to create sparkle sound:', error)
      return null
    }
  }

  private createBrushSound(): AudioBuffer | null {
    const audioContext = this.ensureAudioContext()
    if (!audioContext) {
      console.warn('Cannot create brush sound: no audio context')
      return null
    }
    
    try {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.2, audioContext.sampleRate)
      const data = buffer.getChannelData(0)
      
      for (let i = 0; i < data.length; i++) {
        const t = i / audioContext.sampleRate
        // Soft brushing noise
        data[i] = (Math.random() - 0.5) * Math.exp(-t * 10) * 0.1
      }
      
      return buffer
    } catch (error) {
      console.warn('Failed to create brush sound:', error)
      return null
    }
  }

  private createWhooshSound(): AudioBuffer | null {
    const audioContext = this.ensureAudioContext()
    if (!audioContext) {
      console.warn('Cannot create whoosh sound: no audio context')
      return null
    }
    
    try {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.4, audioContext.sampleRate)
      const data = buffer.getChannelData(0)
      
      for (let i = 0; i < data.length; i++) {
        const t = i / audioContext.sampleRate
        // Sweeping whoosh
        const frequency = 100 + (t * 300) // Rising pitch
        const noise = (Math.random() - 0.5) * 0.3
        const tone = Math.sin(2 * Math.PI * frequency * t) * 0.1
        data[i] = (noise + tone) * Math.exp(-t * 3) * 0.2
      }
      
      return buffer
    } catch (error) {
      console.warn('Failed to create whoosh sound:', error)
      return null
    }
  }
    
  private createHeartSound(): AudioBuffer | null {
    const audioContext = this.ensureAudioContext()
    if (!audioContext) {
      console.warn('Cannot create heart sound: no audio context')
      return null
    }
    
    try {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.6, audioContext.sampleRate)
      const data = buffer.getChannelData(0)
      
      // Double thump like a heartbeat
      const thump1Length = Math.floor(data.length * 0.3)
      const thump2Start = Math.floor(data.length * 0.4)
      const thump2Length = Math.floor(data.length * 0.25)
      
      // First thump (stronger)
      for (let i = 0; i < thump1Length; i++) {
        const t = i / audioContext.sampleRate
        data[i] = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 15) * 0.3
      }
      
      // Second thump (softer)
      for (let i = thump2Start; i < thump2Start + thump2Length; i++) {
        const t = (i - thump2Start) / audioContext.sampleRate
        data[i] = Math.sin(2 * Math.PI * 50 * t) * Math.exp(-t * 20) * 0.2
      }
      
      return buffer
    } catch (error) {
      console.warn('Failed to create heart sound:', error)
      return null
    }
  }

  /**
   * Play a sound effect
   */
  public async play(soundType: SoundType, volume: number = 0.5): Promise<void> {
    if (!this.isEnabled) {
      return
    }

    try {
      // Ensure audio context is created (needed for user interaction requirement)
      const audioContext = this.ensureAudioContext()
      if (!audioContext) {
        console.warn(`Cannot play sound ${soundType}: no audio context`)
        return
      }

      // Generate sounds if not already created
      if (this.sounds.size === 0) {
        await this.generateSounds()
      }

      if (!this.sounds.has(soundType)) {
        console.warn(`Sound ${soundType} not available`)
        return
      }

      // Resume audio context if suspended (mobile requirement)
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const buffer = this.sounds.get(soundType)
      if (!buffer) {
        console.warn(`Sound buffer for ${soundType} is null`)
        return
      }
      
      const source = audioContext.createBufferSource()
      const gainNode = audioContext.createGain()
      
      source.buffer = buffer
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Set volume
      gainNode.gain.value = Math.max(0, Math.min(1, volume))
      
      // Play the sound
      source.start(0)
      
    } catch (error) {
      console.warn(`Failed to play sound ${soundType}:`, error)
    }
  }
      
      source.buffer = buffer
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)
      gainNode.gain.value = Math.max(0, Math.min(1, volume))
      
      source.start(0)
    } catch (error) {
      console.warn('Failed to play sound:', soundType, error)
    }
  }

  /**
   * Play multiple sounds in sequence with delays
   */
  public async playSequence(sounds: { type: SoundType; delay: number; volume?: number }[]): Promise<void> {
    for (const sound of sounds) {
      await new Promise(resolve => setTimeout(resolve, sound.delay))
      await this.play(sound.type, sound.volume)
    }
  }

  /**
   * Enable or disable sound effects
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  /**
   * Check if sounds are enabled
   */
  public isEnabledState(): boolean {
    return this.isEnabled
  }
}

// Singleton instance
export const soundEffectsService = new SoundEffectsService()