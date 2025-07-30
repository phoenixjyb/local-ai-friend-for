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
    this.initializeAudioContext()
    this.generateSounds()
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.warn('Audio context not supported:', error)
    }
  }

  /**
   * Generate cute sound effects using Web Audio API
   */
  private async generateSounds() {
    if (!this.audioContext) return

    // Button tap - cute pop sound
    this.sounds.set('button-tap', this.createPopSound())
    
    // Call start - ascending chime
    this.sounds.set('call-start', this.createChimeSound(true))
    
    // Call end - descending chime
    this.sounds.set('call-end', this.createChimeSound(false))
    
    // AI thinking - soft bubbling
    this.sounds.set('ai-thinking', this.createBubbleSound())
    
    // Success - happy chime
    this.sounds.set('success-chime', this.createSuccessSound())
    
    // Error - gentle boop
    this.sounds.set('error-boop', this.createErrorSound())
    
    // Magic sparkle - twinkling
    this.sounds.set('magic-sparkle', this.createSparkleSound())
    
    // Drawing brush - soft brush stroke
    this.sounds.set('drawing-brush', this.createBrushSound())
    
    // Personality switch - whoosh
    this.sounds.set('personality-switch', this.createWhooshSound())
    
    // Heart beat - gentle thump
    this.sounds.set('heart-beat', this.createHeartSound())
    
    // Whoosh - air movement
    this.sounds.set('whoosh', this.createWhooshSound())
    
    // Pop - bubble pop
    this.sounds.set('pop', this.createPopSound())
  }

  private createPopSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context')
    
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    for (let i = 0; i < data.length; i++) {
      const t = i / this.audioContext.sampleRate
      // Quick pop with envelope
      data[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 20) * 0.3
    }
    
    return buffer
  }

  private createChimeSound(ascending: boolean): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context')
    
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.8, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    const frequencies = ascending ? [440, 550, 660, 770] : [770, 660, 550, 440]
    const noteLength = data.length / frequencies.length
    
    for (let note = 0; note < frequencies.length; note++) {
      const startIdx = Math.floor(note * noteLength)
      const endIdx = Math.floor((note + 1) * noteLength)
      
      for (let i = startIdx; i < endIdx; i++) {
        const t = (i - startIdx) / this.audioContext.sampleRate
        const envelope = Math.exp(-t * 3) * (1 - t / (noteLength / this.audioContext.sampleRate))
        data[i] = Math.sin(2 * Math.PI * frequencies[note] * t) * envelope * 0.2
      }
    }
    
    return buffer
  }

  private createBubbleSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context')
    
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.5, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    for (let i = 0; i < data.length; i++) {
      const t = i / this.audioContext.sampleRate
      // Bubbling effect with multiple frequencies
      const bubble1 = Math.sin(2 * Math.PI * 200 * t) * Math.sin(2 * Math.PI * 5 * t)
      const bubble2 = Math.sin(2 * Math.PI * 300 * t) * Math.sin(2 * Math.PI * 3 * t)
      data[i] = (bubble1 + bubble2) * Math.exp(-t * 2) * 0.15
    }
    
    return buffer
  }

  private createSuccessSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context')
    
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.6, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    // Happy ascending arpeggio
    const frequencies = [523, 659, 784, 1047] // C, E, G, C octave
    const noteLength = data.length / frequencies.length
    
    for (let note = 0; note < frequencies.length; note++) {
      const startIdx = Math.floor(note * noteLength)
      const endIdx = Math.floor((note + 1) * noteLength)
      
      for (let i = startIdx; i < endIdx; i++) {
        const t = (i - startIdx) / this.audioContext.sampleRate
        const envelope = Math.exp(-t * 4) * Math.sin(Math.PI * t / (noteLength / this.audioContext.sampleRate))
        data[i] = Math.sin(2 * Math.PI * frequencies[note] * t) * envelope * 0.25
      }
    }
    
    return buffer
  }

  private createErrorSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context')
    
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.3, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    for (let i = 0; i < data.length; i++) {
      const t = i / this.audioContext.sampleRate
      // Gentle descending tone
      const frequency = 400 - (t * 100)
      data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 5) * 0.2
    }
    
    return buffer
  }

  private createSparkleSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context')
    
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.4, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    for (let i = 0; i < data.length; i++) {
      const t = i / this.audioContext.sampleRate
      // Twinkling with high frequencies
      const sparkle1 = Math.sin(2 * Math.PI * 1200 * t) * Math.random() * 0.5
      const sparkle2 = Math.sin(2 * Math.PI * 1600 * t) * Math.random() * 0.3
      data[i] = (sparkle1 + sparkle2) * Math.exp(-t * 8) * 0.15
    }
    
    return buffer
  }

  private createBrushSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context')
    
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    for (let i = 0; i < data.length; i++) {
      const t = i / this.audioContext.sampleRate
      // Soft brushing noise
      data[i] = (Math.random() - 0.5) * Math.exp(-t * 10) * 0.1
    }
    
    return buffer
  }

  private createWhooshSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context')
    
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.4, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    for (let i = 0; i < data.length; i++) {
      const t = i / this.audioContext.sampleRate
      // Sweeping whoosh
      const frequency = 100 + (t * 300) // Rising pitch
      const noise = (Math.random() - 0.5) * 0.3
      const tone = Math.sin(2 * Math.PI * frequency * t) * 0.1
      data[i] = (noise + tone) * Math.exp(-t * 3) * 0.2
    }
    
    return buffer
  }

  private createHeartSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context')
    
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.6, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    // Double thump like a heartbeat
    const thump1Length = Math.floor(data.length * 0.3)
    const thump2Start = Math.floor(data.length * 0.4)
    const thump2Length = Math.floor(data.length * 0.25)
    
    // First thump (stronger)
    for (let i = 0; i < thump1Length; i++) {
      const t = i / this.audioContext.sampleRate
      data[i] = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 15) * 0.3
    }
    
    // Second thump (softer)
    for (let i = thump2Start; i < thump2Start + thump2Length; i++) {
      const t = (i - thump2Start) / this.audioContext.sampleRate
      data[i] = Math.sin(2 * Math.PI * 50 * t) * Math.exp(-t * 20) * 0.2
    }
    
    return buffer
  }

  /**
   * Play a sound effect
   */
  public async play(soundType: SoundType, volume: number = 0.5): Promise<void> {
    if (!this.isEnabled || !this.audioContext || !this.sounds.has(soundType)) {
      return
    }

    try {
      // Resume audio context if suspended (mobile requirement)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      const buffer = this.sounds.get(soundType)!
      const source = this.audioContext.createBufferSource()
      const gainNode = this.audioContext.createGain()
      
      source.buffer = buffer
      source.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
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