import { toast } from 'sonner'
import { Capacitor } from '@capacitor/core'
import { loggingService } from './LoggingService'

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
  private androidBaseUrls = [
    'http://localhost:11434',
    'http://127.0.0.1:11434',
    'http://10.0.2.2:11434',  // Android emulator host
    'http://192.168.1.100:11434', // Common local network
    'http://0.0.0.0:11434',
    // Samsung S24 Ultra specific addresses (from ifconfig)
    'http://172.16.31.157:11434',  // Your WiFi IP address
    'http://10.100.187.139:11434', // Your mobile data IP
    // Termux specific addresses
    'http://172.17.0.1:11434',  // Docker bridge network (common in Termux)
    'http://10.0.3.2:11434',    // Alternative Android network
    'http://192.168.0.1:11434', // Router gateway alternative
    'http://192.168.1.1:11434', // Router gateway
    'http://10.1.1.1:11434',    // Alternative gateway
    // Try different ports that Termux might use
    'http://127.0.0.1:8080',    // Alternative port
    'http://localhost:8080',    // Alternative port
    'http://0.0.0.0:8080',      // Alternative port
    'http://172.16.31.157:8080', // Your WiFi IP on port 8080
  ]
  private preferredModel = 'gemma2:2b'
  private fallbackModels = ['gemma2:2b', 'gemma:2b', 'gemma:7b', 'llama3.2:1b', 'llama3.2:3b']
  private isConnected = false
  private availableModel: string | null = null
  private workingUrl: string | null = null

  constructor() {
    loggingService.logLLM('🚀 Initializing OllamaService')
    loggingService.logLLM('📱 Platform detection', { 
      isNative: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform()
    })
    loggingService.logLLM('🎯 Preferred model', { model: this.preferredModel })
    loggingService.logLLM('🌐 URLs to test', { 
      urlCount: Capacitor.isNativePlatform() ? this.androidBaseUrls.length : 1,
      urls: Capacitor.isNativePlatform() ? this.androidBaseUrls : [this.baseUrl]
    })
  }

  async checkConnection(): Promise<boolean> {
    const platform = Capacitor.isNativePlatform() ? 'Android/Native' : 'Web'
    loggingService.logLLM('🚀 Starting connection check', { platform })
    
    try {
      // Try different URLs for Android compatibility
      const urlsToTry = Capacitor.isNativePlatform() ? this.androidBaseUrls : [this.baseUrl]
      loggingService.logLLM('📡 Testing URLs', { 
        count: urlsToTry.length,
        urls: urlsToTry
      })
      
      for (let i = 0; i < urlsToTry.length; i++) {
        const url = urlsToTry[i]
        try {
          loggingService.logLLM(`🔍 Testing connection ${i + 1}/${urlsToTry.length}`, { url })
          
          const startTime = Date.now()
          const response = await fetch(`${url}/api/version`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000),
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          })
          const responseTime = Date.now() - startTime
          
          loggingService.logLLM('📊 Response received', { 
            url,
            status: response.status,
            responseTime: `${responseTime}ms`
          })
          
          if (response.ok) {
            const data = await response.json()
            loggingService.logLLM('✅ SUCCESS! Ollama connected', { 
              url,
              version: data.version || 'unknown'
            })
            loggingService.logLLM('🎯 Setting working URL', { workingUrl: url })
            
            this.workingUrl = url
            this.baseUrl = url
            this.isConnected = true
            
            // Test if our preferred model is available
            loggingService.logLLM('🔍 Now checking available models...')
            await this.checkAvailableModels()
            return true
          } else {
            loggingService.logLLM('❌ HTTP Error', { 
              url,
              status: response.status,
              statusText: response.statusText
            })
          }
        } catch (urlError) {
          loggingService.logLLM('💥 Connection failed', { 
            url,
            error: urlError.message,
            errorName: urlError.name
          })
          continue
        }
      }
      
      loggingService.logLLM('❌ FAILURE: All connection attempts failed', { 
        urlCount: urlsToTry.length 
      })
      this.isConnected = false
      this.workingUrl = null
      return false
    } catch (error) {
      loggingService.logLLM('💥 Unexpected error during connection check', {
        error: error.message,
        errorName: error.name
      })
      this.isConnected = false
      this.workingUrl = null
      return false
    }
  }

  private async checkAvailableModels(): Promise<void> {
    console.log(`🔍 [OllamaService] Checking available models at ${this.baseUrl}`)
    
    try {
      const startTime = Date.now()
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      })
      const responseTime = Date.now() - startTime
      
      console.log(`📊 [OllamaService] Models API response: status=${response.status}, time=${responseTime}ms`)
      
      if (response.ok) {
        const data = await response.json()
        const models = data.models || []
        console.log(`📋 [OllamaService] Found ${models.length} available models:`, models.map(m => m.name))
        
        // Check if our preferred model exists
        console.log(`🎯 [OllamaService] Looking for preferred model: ${this.preferredModel}`)
        const preferredExists = models.find(m => m.name.includes(this.preferredModel))
        if (preferredExists) {
          this.availableModel = preferredExists.name
          console.log(`✅ [OllamaService] SUCCESS! Preferred model found: ${this.availableModel}`)
          return
        }
        
        console.log(`⚠️ [OllamaService] Preferred model not found, trying fallbacks:`, this.fallbackModels)
        // Try fallback models
        for (const fallback of this.fallbackModels) {
          console.log(`🔍 [OllamaService] Checking fallback: ${fallback}`)
          const fallbackExists = models.find(m => m.name.includes(fallback))
          if (fallbackExists) {
            this.availableModel = fallbackExists.name
            console.log(`✅ [OllamaService] Fallback model found: ${this.availableModel}`)
            return
          }
        }
        
        if (!this.availableModel && models.length > 0) {
          this.availableModel = models[0].name
          console.log(`⚠️ [OllamaService] No preferred/fallback models found, using first available: ${this.availableModel}`)
        } else if (models.length === 0) {
          console.log(`❌ [OllamaService] No models available on this Ollama instance`)
        }
      } else {
        console.log(`❌ [OllamaService] Failed to fetch models: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.log('💥 [OllamaService] Error checking available models:', {
        name: error.name,
        message: error.message,
        url: this.baseUrl
      })
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
    console.log(`🎤 [OllamaService] Generate request received`)
    console.log(`🔗 [OllamaService] Connected: ${this.isConnected}, Model: ${this.availableModel}, URL: ${this.workingUrl}`)
    
    if (!this.isConnected || !this.availableModel) {
      console.log(`❌ [OllamaService] Cannot generate - not connected or no model available`)
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

    console.log(`📤 [OllamaService] Sending request to ${this.baseUrl}/api/generate`)
    console.log(`📊 [OllamaService] Request body:`, {
      model: requestBody.model,
      promptLength: prompt.length,
      options: requestBody.options
    })

    try {
      const startTime = Date.now()
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000) // 30 second timeout for generation
      })
      const responseTime = Date.now() - startTime

      console.log(`📥 [OllamaService] Response received: status=${response.status}, time=${responseTime}ms`)

      if (!response.ok) {
        console.log(`❌ [OllamaService] API Error: ${response.status} ${response.statusText}`)
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data: OllamaResponse = await response.json()
      console.log(`✅ [OllamaService] Generation successful, response length: ${data.response?.length || 0} chars`)
      
      if (!data.response) {
        console.log(`❌ [OllamaService] Empty response from model`)
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

      console.log(`📝 [OllamaService] Cleaned response length: ${cleanResponse.length} chars`)
      return cleanResponse
    } catch (error) {
      console.log(`💥 [OllamaService] Generation failed:`, {
        name: error.name,
        message: error.message,
        url: this.baseUrl
      })
      throw error
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

  // Diagnostic methods for debugging connection issues
  async getConnectionDiagnostics(): Promise<{
    platform: string
    isNative: boolean
    testedUrls: { url: string; status: string; error?: string }[]
    workingUrl: string | null
    modelsFound: string[]
    preferredModelAvailable: boolean
  }> {
    const results = {
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      testedUrls: [] as { url: string; status: string; error?: string }[],
      workingUrl: this.workingUrl,
      modelsFound: [] as string[],
      preferredModelAvailable: false
    }

    // Test all possible URLs
    const urlsToTry = Capacitor.isNativePlatform() ? this.androidBaseUrls : [this.baseUrl]
    
    for (const url of urlsToTry) {
      try {
        const response = await fetch(`${url}/api/version`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000),
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          results.testedUrls.push({ 
            url, 
            status: `✅ Connected (v${data.version || 'unknown'})` 
          })
          
          // Also check models if this URL works
          try {
            const modelsResponse = await fetch(`${url}/api/tags`, {
              method: 'GET',
              signal: AbortSignal.timeout(3000)
            })
            
            if (modelsResponse.ok) {
              const modelsData = await modelsResponse.json()
              const models = modelsData.models || []
              results.modelsFound = models.map(m => m.name)
              results.preferredModelAvailable = models.some(m => m.name.includes(this.preferredModel))
            }
          } catch (modelsError) {
            // Ignore model checking errors
          }
        } else {
          results.testedUrls.push({ 
            url, 
            status: `❌ HTTP ${response.status}`,
            error: response.statusText
          })
        }
      } catch (error) {
        results.testedUrls.push({ 
          url, 
          status: '❌ Connection failed',
          error: error.message
        })
      }
    }

    return results
  }

  // Force reconnection attempt
  async forceReconnect(): Promise<boolean> {
    console.log('🔄 [OllamaService] Force reconnection initiated')
    console.log('🧹 [OllamaService] Clearing previous connection state')
    
    this.isConnected = false
    this.workingUrl = null
    this.availableModel = null
    
    console.log('🔍 [OllamaService] Starting fresh connection attempt')
    const result = await this.checkConnection()
    
    if (result) {
      console.log('✅ [OllamaService] Reconnection successful, reinitializing...')
      await this.initialize()
    } else {
      console.log('❌ [OllamaService] Reconnection failed')
    }
    
    return result
  }
}

export const ollamaService = new OllamaService()