import { toast } from 'sonner'
import { ollamaService } from './OllamaService'

export type LLMMode = 'cloud' | 'local' | 'auto'

export interface LLMServiceConfig {
  mode: LLMMode
  cloudModel: string
  localModel: string
  fallbackEnabled: boolean
  timeoutMs: number
}

export interface LLMResponse {
  response: string
  source: 'cloud' | 'local' | 'fallback'
  model?: string
  error?: string
}

/**
 * Enhanced LLM Service with cloud/local toggle and fallback strategies
 * Supports both Spark Cloud LLM and local Ollama with intelligent fallbacks
 */
export class LLMService {
  private config: LLMServiceConfig = {
    mode: 'cloud', // Default to cloud
    cloudModel: 'gpt-4o-mini',
    localModel: 'gemma2:2b',
    fallbackEnabled: true,
    timeoutMs: 10000
  }

  private isLocalAvailable = false
  private isCloudAvailable = true // Assume cloud is available initially

  constructor() {
    this.checkAvailability()
  }

  /**
   * Set the LLM mode (cloud, local, or auto)
   */
  setMode(mode: LLMMode) {
    this.config.mode = mode
    console.log(`🔄 LLM mode changed to: ${mode}`)
    
    // Show appropriate toast based on mode
    switch (mode) {
      case 'cloud':
        toast.info('🌐 Using cloud-based AI')
        break
      case 'local':
        toast.info('📱 Using local AI (Ollama)')
        break
      case 'auto':
        toast.info('🤖 Auto-selecting best available AI')
        break
    }
  }

  /**
   * Get current mode
   */
  getMode(): LLMMode {
    return this.config.mode
  }

  /**
   * Check availability of both cloud and local LLM services
   */
  async checkAvailability(): Promise<{ cloud: boolean; local: boolean }> {
    // Check cloud availability (assume true if online)
    this.isCloudAvailable = navigator.onLine

    // Check local Ollama availability
    try {
      this.isLocalAvailable = await ollamaService.checkConnection()
      if (this.isLocalAvailable) {
        await ollamaService.detectAvailableModel()
      }
    } catch (error) {
      console.error('❌ Error checking local LLM:', error)
      this.isLocalAvailable = false
    }

    console.log(`🔍 LLM Availability - Cloud: ${this.isCloudAvailable}, Local: ${this.isLocalAvailable}`)
    
    return {
      cloud: this.isCloudAvailable,
      local: this.isLocalAvailable
    }
  }

  /**
   * Get the best available LLM based on current mode and availability
   */
  private getBestAvailableLLM(): 'cloud' | 'local' | 'none' {
    switch (this.config.mode) {
      case 'cloud':
        return this.isCloudAvailable ? 'cloud' : 
               (this.config.fallbackEnabled && this.isLocalAvailable) ? 'local' : 'none'
        
      case 'local':
        return this.isLocalAvailable ? 'local' : 
               (this.config.fallbackEnabled && this.isCloudAvailable) ? 'cloud' : 'none'
        
      case 'auto':
        // Prefer local for privacy, fallback to cloud
        if (this.isLocalAvailable) return 'local'
        if (this.isCloudAvailable) return 'cloud'
        return 'none'
        
      default:
        return 'none'
    }
  }

  /**
   * Generate AI response with intelligent fallback strategies
   */
  async generateResponse(prompt: string, personalityId?: string): Promise<LLMResponse> {
    const bestLLM = this.getBestAvailableLLM()
    
    if (bestLLM === 'none') {
      return {
        response: this.getFallbackResponse(personalityId),
        source: 'fallback',
        error: 'No LLM services available'
      }
    }

    // Try primary LLM
    try {
      const result = await this.tryLLM(bestLLM, prompt)
      if (result.response) {
        return result
      }
    } catch (error) {
      console.error(`❌ Primary LLM (${bestLLM}) failed:`, error)
    }

    // Try fallback LLM if enabled
    if (this.config.fallbackEnabled) {
      const fallbackLLM = bestLLM === 'cloud' ? 'local' : 'cloud'
      const canUseFallback = fallbackLLM === 'cloud' ? this.isCloudAvailable : this.isLocalAvailable
      
      if (canUseFallback) {
        try {
          console.log(`🔄 Trying fallback LLM: ${fallbackLLM}`)
          toast.info(`Switching to ${fallbackLLM} AI...`)
          
          const result = await this.tryLLM(fallbackLLM, prompt)
          if (result.response) {
            return result
          }
        } catch (error) {
          console.error(`❌ Fallback LLM (${fallbackLLM}) failed:`, error)
        }
      }
    }

    // Final fallback to static responses
    toast.warning('Using offline responses')
    return {
      response: this.getFallbackResponse(personalityId),
      source: 'fallback',
      error: 'All LLM services failed'
    }
  }

  /**
   * Try a specific LLM (cloud or local)
   */
  private async tryLLM(type: 'cloud' | 'local', prompt: string): Promise<LLMResponse> {
    if (type === 'cloud') {
      return this.tryCloudLLM(prompt)
    } else {
      return this.tryLocalLLM(prompt)
    }
  }

  /**
   * Try cloud LLM (Spark)
   */
  private async tryCloudLLM(prompt: string): Promise<LLMResponse> {
    if (!this.isCloudAvailable) {
      throw new Error('Cloud LLM not available')
    }

    try {
      // Check if spark global is available
      if (typeof window === 'undefined' || !window.spark || !window.spark.llm) {
        throw new Error('Spark API not available')
      }
      
      const sparkPrompt = window.spark.llmPrompt`${prompt}`
      const response = await window.spark.llm(sparkPrompt, this.config.cloudModel)
      
      console.log('✅ Cloud LLM response received')
      return {
        response,
        source: 'cloud',
        model: this.config.cloudModel
      }
    } catch (error) {
      console.error('❌ Cloud LLM error:', error)
      throw error
    }
  }

  /**
   * Try local LLM (Ollama)
   */
  private async tryLocalLLM(prompt: string): Promise<LLMResponse> {
    if (!this.isLocalAvailable) {
      throw new Error('Local LLM not available')
    }

    try {
      const response = await ollamaService.generateResponse(prompt)
      
      console.log('✅ Local LLM response received')
      return {
        response,
        source: 'local',
        model: ollamaService.getCurrentModel()
      }
    } catch (error) {
      console.error('❌ Local LLM error:', error)
      throw error
    }
  }

  /**
   * Get static fallback responses when no LLM is available
   */
  private getFallbackResponse(personalityId?: string): string {
    const responses = this.getPersonalityFallbackResponses(personalityId)
    return responses[Math.floor(Math.random() * responses.length)]
  }

  /**
   * Get personality-specific fallback responses
   */
  private getPersonalityFallbackResponses(personalityId?: string): string[] {
    switch (personalityId) {
      case 'cheerful-buddy':
        return [
          "That's absolutely wonderful! You're doing brilliantly!",
          "How exciting! I'm so proud of you!",
          "That sounds fantastic! What a superstar you are!",
          "Brilliant! Tell me more about that amazing thing!",
          "You're incredible! I love hearing your stories!"
        ]
      case 'curious-explorer':
        return [
          "That's fascinating! What made you think of that?",
          "How interesting! Can you tell me more about it?",
          "What a great observation! What else did you notice?",
          "That's curious indeed! How do you think that works?",
          "What an intriguing discovery! What questions does that give you?"
        ]
      case 'gentle-friend':
        return [
          "That sounds lovely, dear. How did that make you feel?",
          "Thank you for sharing that with me. You're very thoughtful.",
          "That's wonderful. I'm here listening to every word.",
          "How peaceful that sounds. Tell me more when you're ready.",
          "That's very sweet of you to tell me. I care about what you're thinking."
        ]
      case 'silly-joker':
        return [
          "Haha! That's hilarious! Got any more funny stories?",
          "What a giggle! You always make me smile!",
          "That's bonkers in the best way! Tell me another funny one!",
          "Ha! You're absolutely crackers and I love it!",
          "That tickled me pink! What other silly things happened?"
        ]
      case 'wise-owl':
        return [
          "That's very thoughtful. What do you think about it?",
          "How wise of you to notice that. What else can you learn?",
          "That shows great thinking! What would you do next?",
          "Very perceptive! How might that help others?",
          "That's a clever observation. What patterns do you see?"
        ]
      case 'creative-artist':
        return [
          "That sounds absolutely artistic! What colors would you use?",
          "How wonderfully imaginative! What inspired that thought?",
          "That's so creative! You have such an artistic soul!",
          "What a magical idea! Tell me more about your creative vision!"
        ]
      default:
        return [
          "That's lovely! Tell me more about that.",
          "How wonderful! What happened next?",
          "That sounds brilliant! I'd love to hear more.",
          "I'm listening! Please continue your story."
        ]
    }
  }

  /**
   * Get current status for UI display
   */
  getStatus(): {
    mode: LLMMode
    cloudAvailable: boolean
    localAvailable: boolean
    currentLLM: 'cloud' | 'local' | 'none'
    modelInfo: string
  } {
    const currentLLM = this.getBestAvailableLLM()
    
    let modelInfo = ''
    if (currentLLM === 'cloud') {
      modelInfo = `Cloud: ${this.config.cloudModel}`
    } else if (currentLLM === 'local') {
      modelInfo = `Local: ${ollamaService.getCurrentModel() || 'Not connected'}`
    } else {
      modelInfo = 'Offline mode'
    }

    return {
      mode: this.config.mode,
      cloudAvailable: this.isCloudAvailable,
      localAvailable: this.isLocalAvailable,
      currentLLM,
      modelInfo
    }
  }

  /**
   * Update availability status (call when network status changes)
   */
  updateAvailability(online: boolean) {
    this.isCloudAvailable = online
    this.checkAvailability()
  }
}

// Export singleton instance
export const llmService = new LLMService()