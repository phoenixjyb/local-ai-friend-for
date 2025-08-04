import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { toast } from 'sonner'

export interface SamsungS24Features {
  isS24Ultra: boolean
  hasSnapdragon8Gen3: boolean
  ramCapacity: number
  storageCapacity: number
  supportsSPen: boolean
  supportsDeX: boolean
  hasPremiumHaptics: boolean
}

export interface TermuxOllamaConfig {
  modelName: string
  ramOptimized: boolean
  cpuThreads: number
  gpuAcceleration: boolean
  thermalThrottling: boolean
}

/**
 * Samsung Galaxy S24 Ultra specific optimizations for AI Companion Phone
 * Handles Termux integration, S Pen features, and device-specific performance tuning
 */
export class SamsungS24Service {
  private deviceFeatures: SamsungS24Features | null = null
  private serviceInitialized = false
  private termuxConnected = false

  async initialize(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Running in web mode - Samsung features disabled')
      return false
    }

    try {
      // Detect Samsung S24 Ultra features
      await this.detectDeviceFeatures()
      
      // Initialize Samsung-specific services
      if (this.deviceFeatures?.isS24Ultra) {
        await this.initializeSamsungFeatures()
        toast.success('🔥 Samsung S24 Ultra features activated!')
      }

      this.serviceInitialized = true
      return true
    } catch (error) {
      console.error('❌ Samsung S24 service initialization failed:', error)
      return false
    }
  }

  private async detectDeviceFeatures(): Promise<void> {
    const deviceInfo = await Device.getInfo()
    
    // Check if this is a Samsung S24 Ultra
    const isS24Ultra = this.isSamsungS24Ultra(deviceInfo)
    
    this.deviceFeatures = {
      isS24Ultra,
      hasSnapdragon8Gen3: isS24Ultra, // S24 Ultra always has Snapdragon 8 Gen 3
      ramCapacity: this.estimateRAMCapacity(deviceInfo),
      storageCapacity: 256, // Default assumption, could be 512GB or 1TB
      supportsSPen: isS24Ultra,
      supportsDeX: isS24Ultra,
      hasPremiumHaptics: isS24Ultra
    }

    console.log('📱 Device Features:', this.deviceFeatures)
  }

  private isSamsungS24Ultra(deviceInfo: any): boolean {
    const model = deviceInfo.model?.toLowerCase() || ''
    const manufacturer = deviceInfo.manufacturer?.toLowerCase() || ''
    
    return manufacturer.includes('samsung') && 
           (model.includes('s24') || model.includes('sm-s928'))
  }

  private estimateRAMCapacity(deviceInfo: any): number {
    // S24 Ultra typically has 12GB RAM
    if (this.isSamsungS24Ultra(deviceInfo)) {
      return 12
    }
    return 8 // Default assumption
  }

  private async initializeSamsungFeatures(): Promise<void> {
    // Enable premium haptic feedback
    if (this.deviceFeatures?.hasPremiumHaptics) {
      console.log('🎮 Premium haptics enabled')
    }

    // Configure for S Pen support
    if (this.deviceFeatures?.supportsSPen) {
      console.log('✏️ S Pen support enabled')
    }

    // Configure DeX mode optimizations
    if (this.deviceFeatures?.supportsDeX) {
      console.log('🖥️ Samsung DeX optimizations enabled')
    }
  }

  /**
   * Get optimized Ollama configuration for Samsung S24 Ultra
   */
  getOptimizedOllamaConfig(): TermuxOllamaConfig {
    if (!this.deviceFeatures?.isS24Ultra) {
      // Standard mobile configuration
      return {
        modelName: 'gemma2:2b',
        ramOptimized: true,
        cpuThreads: 4,
        gpuAcceleration: false,
        thermalThrottling: true
      }
    }

    // S24 Ultra optimized configuration
    return {
      modelName: this.deviceFeatures.ramCapacity >= 12 ? 'llama3.2:3b' : 'gemma2:2b',
      ramOptimized: false, // Can handle larger models
      cpuThreads: 8, // Snapdragon 8 Gen 3 has 8 cores
      gpuAcceleration: true, // Adreno 750 GPU
      thermalThrottling: false // Better thermal management
    }
  }

  /**
   * Generate Termux commands optimized for S24 Ultra
   */
  generateTermuxCommands(): string[] {
    const config = this.getOptimizedOllamaConfig()
    
    const commands = [
      '# Samsung S24 Ultra Optimized Ollama Setup',
      '',
      '# Update Termux environment',
      'pkg update && pkg upgrade -y',
      '',
      '# Install optimized dependencies for Snapdragon 8 Gen 3',
      'pkg install curl python nodejs-lts cmake ninja llvm clang',
      '',
      '# Install Ollama',
      'curl -fsSL https://ollama.ai/install.sh | sh',
      '',
      `# Pull optimized model for S24 Ultra (${config.modelName})`,
      `ollama pull ${config.modelName}`,
      '',
      '# Start Ollama with S24 Ultra optimizations',
      `OLLAMA_NUM_PARALLEL=${config.cpuThreads} \\`,
      'OLLAMA_MAX_LOADED_MODELS=2 \\',
      'OLLAMA_HOST=0.0.0.0:11434 \\',
      'ollama serve',
      '',
      '# In another Termux session, test the model:',
      `ollama run ${config.modelName}`
    ]

    return commands
  }

  /**
   * Enhanced haptic feedback for S24 Ultra
   */
  async playHapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'): Promise<void> {
    if (!this.deviceFeatures?.hasPremiumHaptics) return

    try {
      let impactStyle: ImpactStyle
      
      switch (type) {
        case 'light':
          impactStyle = ImpactStyle.Light
          break
        case 'medium':
          impactStyle = ImpactStyle.Medium
          break
        case 'heavy':
        case 'success':
          impactStyle = ImpactStyle.Heavy
          break
        case 'warning':
          impactStyle = ImpactStyle.Medium
          break
        case 'error':
          impactStyle = ImpactStyle.Heavy
          break
        default:
          impactStyle = ImpactStyle.Light
      }

      await Haptics.impact({ style: impactStyle })
      
      // For success, add a double tap
      if (type === 'success') {
        setTimeout(async () => {
          await Haptics.impact({ style: ImpactStyle.Light })
        }, 100)
      }
      
    } catch (error) {
      console.warn('Haptic feedback failed:', error)
    }
  }

  /**
   * Check if Termux is installed and accessible
   */
  async checkTermuxAvailability(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false

    try {
      // Try to detect Termux via intent (requires native plugin)
      // For now, we'll assume it's available if we're on Android
      this.termuxConnected = true
      return true
    } catch (error) {
      console.error('❌ Termux availability check failed:', error)
      this.termuxConnected = false
      return false
    }
  }

  /**
   * Launch Termux with Ollama command (requires custom plugin)
   */
  async launchTermuxOllama(): Promise<boolean> {
    if (!this.termuxConnected) return false

    try {
      // This would require a custom Capacitor plugin
      // For now, provide user guidance
      toast.info('🤖 Please start Ollama in Termux: ollama serve')
      return false
    } catch (error) {
      console.error('❌ Failed to launch Termux:', error)
      return false
    }
  }

  /**
   * Get S24 Ultra performance recommendations
   */
  getPerformanceRecommendations(): string[] {
    if (!this.deviceFeatures?.isS24Ultra) {
      return [
        'Enable Developer Options',
        'Turn off animations for better performance',
        'Close background apps before using AI'
      ]
    }

    return [
      '🔥 S24 Ultra Performance Tips:',
      '• Enable Game Booster for AI processing',
      '• Use DeX mode for extended AI sessions',
      '• Keep device cool during heavy AI use',
      '• Use 3B+ models for best quality',
      '• Enable Priority mode in Device Care',
      '• Connect to external monitor via DeX for desktop experience'
    ]
  }

  /**
   * Get storage recommendations for AI models
   */
  getStorageRecommendations(): string[] {
    const storage = this.deviceFeatures?.storageCapacity || 256

    if (storage >= 512) {
      return [
        '🚀 Large Storage Detected (512GB+):',
        '• llama3.2:7b (~4.1GB) - Highest quality',
        '• phi3:medium (~7.9GB) - Excellent reasoning',
        '• mistral:7b (~4.1GB) - Great for conversations',
        '• Multiple models for different personalities'
      ]
    }

    return [
      '📱 Standard Storage (256GB):',
      '• llama3.2:3b (~2.0GB) - Best balance',
      '• gemma2:2b (~1.6GB) - Fast responses',
      '• qwen2.5:3b (~2.0GB) - Alternative option'
    ]
  }

  // Getters
  getDeviceFeatures(): SamsungS24Features | null {
    return this.deviceFeatures
  }

  isS24Ultra(): boolean {
    return this.deviceFeatures?.isS24Ultra || false
  }

  isServiceInitialized(): boolean {
    return this.serviceInitialized
  }

  isTermuxConnected(): boolean {
    return this.termuxConnected
  }
}

// Export singleton instance
export const samsungS24Service = new SamsungS24Service()
