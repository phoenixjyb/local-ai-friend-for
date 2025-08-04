import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Gear, DeviceMobile, Brain, Lightning, Cpu } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { samsungS24Service } from '@/services/SamsungS24Service'
import { ollamaService } from '@/services/OllamaService'

interface LocalAIStatus {
  ollamaConnected: boolean
  modelLoaded: string | null
  responseTime: number | null
  isS24Ultra: boolean
  optimizationsActive: boolean
}

/**
 * Enhanced AI Configuration Panel specifically for Samsung S24 Ultra
 * Provides device-specific optimizations and local AI setup guidance
 */
export default function SamsungAIPanel() {
  const [aiStatus, setAIStatus] = useState<LocalAIStatus>({
    ollamaConnected: false,
    modelLoaded: null,
    responseTime: null,
    isS24Ultra: false,
    optimizationsActive: false
  })
  
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [showTermuxCommands, setShowTermuxCommands] = useState(false)

  useEffect(() => {
    initializeSamsungServices()
  }, [])

  const initializeSamsungServices = async () => {
    console.log('🔥 Initializing Samsung S24 Ultra AI services...')
    
    // Initialize Samsung-specific features
    const samsungInitialized = await samsungS24Service.initialize()
    
    // Check local AI status
    await checkLocalAIStatus()
    
    if (samsungInitialized) {
      const features = samsungS24Service.getDeviceFeatures()
      setAIStatus(prev => ({
        ...prev,
        isS24Ultra: features?.isS24Ultra || false,
        optimizationsActive: samsungInitialized
      }))
      
      if (features?.isS24Ultra) {
        toast.success('🔥 Samsung S24 Ultra optimizations activated!')
        await samsungS24Service.playHapticFeedback('success')
      }
    }
  }

  const checkLocalAIStatus = useCallback(async () => {
    try {
      const startTime = Date.now()
      
      // Check Ollama connection
      const connected = await ollamaService.checkConnection()
      const model = ollamaService.getCurrentModel()
      
      let responseTime: number | null = null
      if (connected && model) {
        try {
          // Test response time with a simple prompt
          await ollamaService.generate('Hello', { max_tokens: 5 })
          responseTime = Date.now() - startTime
        } catch (error) {
          console.warn('Response time test failed:', error)
        }
      }
      
      setAIStatus(prev => ({
        ...prev,
        ollamaConnected: connected,
        modelLoaded: model,
        responseTime
      }))
      
      // Update AI availability status
      console.log('✅ Local AI status updated')
      
    } catch (error) {
      console.error('❌ AI status check failed:', error)
      setAIStatus(prev => ({
        ...prev,
        ollamaConnected: false,
        modelLoaded: null,
        responseTime: null
      }))
    }
  }, [])

  const testAIConnection = async () => {
    setIsTestingConnection(true)
    await samsungS24Service.playHapticFeedback('medium')
    
    try {
      // Initialize Ollama if not already done
      if (!aiStatus.ollamaConnected) {
        const initialized = await ollamaService.initialize()
        if (!initialized) {
          toast.error('❌ Failed to connect to local AI. Please start Ollama in Termux.')
          return
        }
      }
      
      // Test AI response
      const startTime = Date.now()
      const response = await ollamaService.generate('Say hello in a friendly way for a child', {
        max_tokens: 20,
        temperature: 0.7
      })
      const responseTime = Date.now() - startTime
      
      setAIStatus(prev => ({
        ...prev,
        ollamaConnected: true,
        responseTime
      }))
      
      toast.success(`✅ AI Test Success! Response: "${response.slice(0, 50)}..." (${responseTime}ms)`)
      await samsungS24Service.playHapticFeedback('success')
      
    } catch (error) {
      console.error('❌ AI test failed:', error)
      toast.error(`❌ AI test failed: ${error.message}`)
      await samsungS24Service.playHapticFeedback('error')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const openTermuxSetup = () => {
    setShowTermuxCommands(!showTermuxCommands)
    samsungS24Service.playHapticFeedback('light')
  }

  const copyTermuxCommands = () => {
    const commands = samsungS24Service.generateTermuxCommands().join('\n')
    navigator.clipboard.writeText(commands)
    toast.success('📋 Termux commands copied to clipboard!')
    samsungS24Service.playHapticFeedback('success')
  }

  const getStatusColor = (connected: boolean): string => {
    return connected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
  }

  const getPerformanceLevel = (): string => {
    if (!aiStatus.responseTime) return 'Unknown'
    if (aiStatus.responseTime < 1000) return 'Excellent'
    if (aiStatus.responseTime < 3000) return 'Good'
    if (aiStatus.responseTime < 5000) return 'Fair'
    return 'Slow'
  }

  return (
    <Card className="p-6 space-y-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Brain size={24} className="text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {aiStatus.isS24Ultra ? '🔥 Samsung S24 Ultra AI Center' : '🤖 Local AI Center'}
          </h3>
          <p className="text-sm text-gray-600">
            {aiStatus.isS24Ultra 
              ? 'Optimized for Snapdragon 8 Gen 3 with 12GB RAM' 
              : 'Local AI configuration and status'}
          </p>
        </div>
      </div>

      {/* Device & Optimization Status */}
      {aiStatus.isS24Ultra && (
        <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <DeviceMobile size={16} className="text-purple-600" />
            <span className="font-medium text-purple-900">Samsung S24 Ultra Detected</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Cpu size={12} className="text-purple-600" />
              <span>Snapdragon 8 Gen 3</span>
            </div>
            <div className="flex items-center gap-1">
              <Lightning size={12} className="text-purple-600" />
              <span>12GB RAM Optimized</span>
            </div>
          </div>
        </div>
      )}

      {/* AI Status Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Local AI Status</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Ollama Connection:</span>
              <Badge className={getStatusColor(aiStatus.ollamaConnected)}>
                {aiStatus.ollamaConnected ? '✅ Connected' : '❌ Disconnected'}
              </Badge>
            </div>
            
            {aiStatus.modelLoaded && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Model:</span>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  {aiStatus.modelLoaded}
                </Badge>
              </div>
            )}
            
            {aiStatus.responseTime && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Performance:</span>
                <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                  {getPerformanceLevel()} ({aiStatus.responseTime}ms)
                </Badge>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Quick Actions</h4>
          <div className="space-y-2">
            <Button 
              onClick={testAIConnection}
              disabled={isTestingConnection}
              className="w-full"
              variant="outline"
            >
              {isTestingConnection ? '🔄 Testing...' : '🧪 Test AI Connection'}
            </Button>
            
            <Button 
              onClick={checkLocalAIStatus}
              className="w-full"
              variant="outline"
            >
              🔍 Refresh Status
            </Button>
          </div>
        </div>
      </div>

      {/* Termux Setup Commands */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Termux Setup</h4>
          <Button onClick={openTermuxSetup} variant="ghost" size="sm">
            <Gear size={16} className="mr-1" />
            {showTermuxCommands ? 'Hide' : 'Show'} Commands
          </Button>
        </div>
        
        {showTermuxCommands && (
          <div className="space-y-3">
            <div className="p-4 bg-gray-900 rounded-lg text-green-400 font-mono text-xs overflow-x-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-300"># Samsung S24 Ultra Optimized Setup</span>
                <Button onClick={copyTermuxCommands} size="sm" variant="ghost" className="text-green-400 hover:text-green-300">
                  📋 Copy
                </Button>
              </div>
              {samsungS24Service.generateTermuxCommands().map((line, index) => (
                <div key={index} className={line.startsWith('#') ? 'text-green-300' : ''}>
                  {line || '\u00A0'}
                </div>
              ))}
            </div>
            
            {/* Performance & Storage Recommendations */}
            {aiStatus.isS24Ultra && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h5 className="font-medium text-blue-900 mb-2">Performance Tips</h5>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {samsungS24Service.getPerformanceRecommendations().map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <h5 className="font-medium text-green-900 mb-2">Model Recommendations</h5>
                  <ul className="text-xs text-green-700 space-y-1">
                    {samsungS24Service.getStorageRecommendations().map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connection Help */}
      {!aiStatus.ollamaConnected && (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 mt-0.5">⚠️</div>
            <div>
              <h5 className="font-medium text-yellow-900 mb-1">Local AI Not Connected</h5>
              <p className="text-sm text-yellow-700 mb-2">
                To use local AI, start Ollama in Termux first:
              </p>
              <div className="bg-yellow-100 p-2 rounded font-mono text-xs text-yellow-800">
                ollama serve
              </div>
              <p className="text-xs text-yellow-600 mt-2">
                The app will automatically connect to localhost:11434 when Ollama is running.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
