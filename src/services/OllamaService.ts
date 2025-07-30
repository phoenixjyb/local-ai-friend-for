import { toast } from 'sonner'

export interface OllamaModel {
  name: string
  modified_at: string
  size: number
  digest: string
  details?: {
    family: string
    format: string
    parameter_size: string
    quantization_level: string
  }
}

export interface OllamaResponse {
  model: string
  created_at: string
  response: string
  done: boolean
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

export class OllamaService {
  private baseUrl = 'http://localhost:11434'
  private preferredModel = 'gemma2:2b'
  private fallbackModels = ['gemma2:2b', 'gemma:2b', 'gemma:7b', 'llama3.2:1b', 'llama3.2:3b']
  private isConnected = false
  private availableModel: string | null = null

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      })
      
      if (response.ok) {
        this.isConnected = true
        return true
      }
      
      this.isConnected = false
      return false
    } catch (error) {
      console.log('Ollama connection check failed:', error)
      this.isConnected = false
      return false
    }
  }

  async getAvailableModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }

      const data = await response.json()
      return data.models || []
    } catch (error) {
      console.error('Error fetching available models:', error)
      return []
    }
  }

  async findBestAvailableModel(): Promise<string | null> {
    const models = await this.getAvailableModels()
    const modelNames = models.map(m => m.name.toLowerCase())
    
    // Check for preferred models in order
    for (const preferredModel of this.fallbackModels) {
      const found = modelNames.find(name => 
        name.includes(preferredModel.toLowerCase()) || 
        name.startsWith(preferredModel.toLowerCase().split(':')[0])
      )
      
      if (found) {
        // Get the actual model name from the original list
        const actualModel = models.find(m => m.name.toLowerCase() === found)
        this.availableModel = actualModel?.name || preferredModel
        return this.availableModel
      }
    }
    
    // If no preferred models found, use the first available model
    if (models.length > 0) {
      this.availableModel = models[0].name
      return this.availableModel
    }
    
    return null
  }

  async initialize(): Promise<boolean> {
    console.log('🤖 Initializing Ollama service...')
    
    const isConnected = await this.checkConnection()
    if (!isConnected) {
      toast.error('Ollama not running. Please start Ollama in Termux first.')
      return false
    }

    const bestModel = await this.findBestAvailableModel()
    if (!bestModel) {
      toast.error('No compatible AI models found. Please install Gemma3 or another supported model.')
      return false
    }

    console.log(`✅ Using model: ${bestModel}`)
    
    // Test the model with a simple prompt
    try {
      await this.generate('Hello', { max_tokens: 10 })
      toast.success(`🚀 Local AI ready! Using ${bestModel.split(':')[0]} model.`)
      return true
    } catch (error) {
      console.error('Model test failed:', error)
      toast.error(`Model ${bestModel} failed to respond. Please check Ollama setup.`)
      return false
    }
  }

  async generate(
    prompt: string, 
    options: {
      temperature?: number
      max_tokens?: number
      top_p?: number
      repeat_penalty?: number
      num_ctx?: number
      stream?: boolean
    } = {}
  ): Promise<string> {
    if (!this.isConnected || !this.availableModel) {
      throw new Error('Ollama not connected or no model available')
    }

    const requestBody = {
      model: this.availableModel,
      prompt: prompt,
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        num_predict: options.max_tokens || 150,
        top_p: options.top_p || 0.9,
        repeat_penalty: options.repeat_penalty || 1.1,
        num_ctx: options.num_ctx || 2048,
        stop: ['\n\nHuman:', '\n\nUser:', 'Human:', 'User:'] // Prevent model from continuing as user
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000) // 30 second timeout for generation
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data: OllamaResponse = await response.json()
      
      if (!data.response) {
        throw new Error('Empty response from Ollama')
      }

      // Clean up the response
      let cleanResponse = data.response.trim()
      
      // Remove any model artifacts or repeated patterns
      cleanResponse = cleanResponse.replace(/\n+/g, ' ').trim()
      
      // Ensure the response is appropriate for children (basic cleanup)
      if (cleanResponse.length > 300) {
        cleanResponse = cleanResponse.substring(0, 300) + '...'
      }

      return cleanResponse
    } catch (error) {
      console.error('Ollama generation error:', error)
      throw new Error(`Failed to generate response: ${error.message}`)
    }
  }

  async generatePersonalizedResponse(prompt: string, personalityStyle: string): Promise<string> {
    // Enhance the prompt based on personality for better local model responses
    const personalityEnhancement = this.getPersonalityEnhancement(personalityStyle)
    const enhancedPrompt = `${personalityEnhancement}\n\nChild says: "${prompt}"\n\nYour response:`
    
    return await this.generate(enhancedPrompt, {
      temperature: 0.8,
      max_tokens: 100,
      top_p: 0.95
    })
  }

  private getPersonalityEnhancement(style: string): string {
    switch (style) {
      case 'cheerful-buddy':
        return 'You are a cheerful, enthusiastic AI friend for a 4-year-old child. Be excited, positive, and encouraging. Use simple words and show lots of enthusiasm.'
      case 'curious-explorer':
        return 'You are a curious AI friend who loves to explore and learn with a 4-year-old child. Ask gentle questions and share fascinating but simple facts.'
      case 'gentle-friend':
        return 'You are a gentle, caring AI friend for a 4-year-old child. Be soft-spoken, kind, and comforting. Listen carefully and respond with warmth.'
      case 'silly-joker':
        return 'You are a playful, silly AI friend for a 4-year-old child. Be funny, make gentle jokes, and be wonderfully goofy in a safe way.'
      case 'wise-owl':
        return 'You are a wise but child-friendly AI friend for a 4-year-old. Share simple wisdom and interesting facts in an easy-to-understand way.'
      case 'creative-artist':
        return 'You are a creative, artistic AI friend for a 4-year-old child. Love art, colors, creativity, and imagination. Encourage their artistic expression.'
      default:
        return 'You are a kind, friendly AI companion for a 4-year-old child. Be age-appropriate, supportive, and engaging.'
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected
  }

  getCurrentModel(): string | null {
    return this.availableModel
  }

  getModelDisplayName(): string {
    if (!this.availableModel) return 'None'
    
    // Return a friendly display name
    if (this.availableModel.includes('gemma')) return 'Gemma (Google)'
    if (this.availableModel.includes('llama')) return 'Llama (Meta)'
    return this.availableModel.split(':')[0]
  }
}

export const ollamaService = new OllamaService()