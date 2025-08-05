import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { ollamaService } from '@/services/OllamaService'
import { loggingService } from '@/services/LoggingService'
import { VoiceChatService } from '@/services/VoiceChatService'
import { Bug, Wifi, RefreshCw, Download, Copy, Share, FileText, Mic, Volume2, Zap, Activity, Eye, EyeOff } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import { TextToSpeech } from '@capacitor-community/text-to-speech'
import AudioVisualization from './AudioVisualization'

interface DebugPanelProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

function DebugPanel({ isOpen = false, onOpenChange }: DebugPanelProps) {
  const [localConnectivity, setLocalConnectivity] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  // ASR Testing States
  const [asrDebugInfo, setAsrDebugInfo] = useState<any>(null)
  const [isTestingASR, setIsTestingASR] = useState(false)
  const [isListeningASR, setIsListeningASR] = useState(false)
  const [lastASRResults, setLastASRResults] = useState<any[]>([])
  const [isVisualizationVisible, setIsVisualizationVisible] = useState(true)
  const [currentTranscription, setCurrentTranscription] = useState('')
  const [partialTranscription, setPartialTranscription] = useState('')
  const [transcriptionHistory, setTranscriptionHistory] = useState<Array<{
    timestamp: string
    text: string
    confidence?: number
    type: 'final' | 'partial'
  }>>([])
  const [asrVolume, setAsrVolume] = useState(0)
  const [voiceService] = useState(new VoiceChatService())
  const recognitionRef = useRef<any>(null)

  // Get current logs
  useEffect(() => {
    const currentLogs = loggingService.getLogs()
    setLogs(currentLogs.map(log => `[${log.timestamp}] ${log.level}: ${log.message} ${log.details ? JSON.stringify(log.details) : ''}`))
  }, [isOpen])

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [logs])

  // Function to scroll to bottom manually
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        })
      }
    }
  }

  const checkOllamaConnectivity = async () => {
    setIsChecking(true)
    try {
      console.log('🔍 [DebugPanel] Manual Ollama connectivity check initiated')
      
      // Add specific debugging for your setup
      console.log('🔍 [DebugPanel] Testing direct 0.0.0.0:11434 first (your working endpoint)')
      
      try {
        const directTest = await fetch('http://0.0.0.0:11434/api/tags', { 
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        })
        console.log('🔍 [DebugPanel] Direct 0.0.0.0 test result:', directTest.status)
        if (directTest.ok) {
          const data = await directTest.json()
          console.log('🔍 [DebugPanel] Direct test found models:', data.models?.length || 0)
        }
      } catch (directError) {
        console.log('🔍 [DebugPanel] Direct 0.0.0.0 test failed:', directError.message)
      }
      
      // Force reconnection attempt
      const connectionResult = await ollamaService.forceReconnect()
      console.log('🔍 [DebugPanel] Connection result:', connectionResult)
      
      // Get detailed diagnostics
      const diagnostics = await ollamaService.getConnectionDiagnostics()
      console.log('🔍 [DebugPanel] Diagnostics:', diagnostics)
      
      setLocalConnectivity({
        connected: connectionResult,
        ...diagnostics
      })
      
      if (connectionResult) {
        toast.success('✅ Ollama connected successfully!')
      } else {
        toast.error('❌ Ollama connection failed - check Termux setup')
      }
    } catch (error) {
      console.error('🔍 [DebugPanel] Connectivity check error:', error)
      toast.error('❌ Connectivity check failed')
    } finally {
      setIsChecking(false)
    }
  }

  // Samsung Galaxy ASR Test with comprehensive debugging
  const testSamsungASR = async () => {
    console.log('🎤 [Samsung ASR Test] Starting comprehensive Samsung Galaxy ASR test...')
    setIsTestingASR(true)
    setIsListeningASR(true)
    
    const startTime = Date.now()
    const minVisualizationTime = 5000 // 5 seconds minimum for debugging
    
    try {
      // Step 1: Check permissions first
      console.log('🎤 [Samsung ASR Test] Step 1: Checking microphone permissions...')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        console.log('🎤 [Samsung ASR Test] ✅ Microphone permission granted')
        stream.getTracks().forEach(track => track.stop())
      } catch (permError) {
        console.error('🎤 [Samsung ASR Test] ❌ Microphone permission denied:', permError)
        toast.error('❌ Microphone permission denied. Please allow microphone access.')
        return
      }

      // Step 2: Check for speech recognition availability
      console.log('🎤 [Samsung ASR Test] Step 2: Checking speech recognition availability...')
      const hasCapacitorASR = Capacitor.isNativePlatform()
      const hasWebASR = typeof window !== 'undefined' && 'webkitSpeechRecognition' in window
      
      console.log('🎤 [Samsung ASR Test] Platform info:', {
        isNative: hasCapacitorASR,
        hasWebASR,
        platform: Capacitor.getPlatform(),
        userAgent: navigator.userAgent
      })

      let result: any = null

      // Step 3: Try Capacitor ASR first (native Android)
      if (hasCapacitorASR) {
        console.log('🎤 [Samsung ASR Test] Step 3: Trying Capacitor ASR (native)...')
        try {
          // Check permissions first
          const permission = await SpeechRecognition.requestPermissions()
          console.log('🎤 [Samsung ASR Test] Capacitor permissions:', permission)
          
          if (permission.speechRecognition === 'granted') {
            result = await SpeechRecognition.start({
              language: navigator.language || 'en-US',
              maxResults: 5,
              prompt: 'Samsung Galaxy ASR Test - Say something...',
              partialResults: true,
              popup: false
            })
            console.log('🎤 [Samsung ASR Test] ✅ Capacitor ASR success:', result)
          } else {
            throw new Error('Capacitor ASR permission denied')
          }
        } catch (capacitorError) {
          console.error('🎤 [Samsung ASR Test] ❌ Capacitor ASR failed:', capacitorError)
          loggingService.log('warn', 'ASR', 'Capacitor ASR failed', { error: capacitorError })
        }
      }

      // Step 4: Fallback to Web ASR if Capacitor failed
      if (!result && hasWebASR) {
        console.log('🎤 [Samsung ASR Test] Step 4: Trying Web Speech ASR...')
        
        result = await new Promise((resolve, reject) => {
          const recognition = new (window as any).webkitSpeechRecognition()
          
          // Samsung Galaxy optimized configuration
          recognition.continuous = false  // Single utterance for stability
          recognition.interimResults = true
          recognition.maxAlternatives = 3
          recognition.lang = navigator.language || 'en-US'
          
          console.log('🎤 [Samsung ASR Test] Web ASR config:', {
            language: recognition.lang,
            continuous: recognition.continuous,
            interimResults: recognition.interimResults
          })

          let hasStarted = false
          let hasResults = false
          let finalResults: string[] = []
          
          const timeout = setTimeout(() => {
            console.log('🎤 [Samsung ASR Test] ⏰ Timeout reached, stopping...')
            if (!hasResults) {
              recognition.stop()
              reject(new Error('ASR timeout after 10 seconds'))
            }
          }, 10000)

          recognition.onstart = () => {
            hasStarted = true
            console.log('🎤 [Samsung ASR Test] ✅ Web ASR started - speak now!')
            toast.info('🎤 Samsung Galaxy ASR listening - speak clearly!')
          }

          recognition.onresult = (event: any) => {
            console.log('🎤 [Samsung ASR Test] 📝 Got results:', event.results.length)
            hasResults = true
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript.trim()
              const confidence = event.results[i][0].confidence || 0
              const isFinal = event.results[i].isFinal
              
              console.log(`🎤 [Samsung ASR Test] Result ${i}:`, {
                transcript,
                confidence,
                isFinal
              })

              if (isFinal) {
                finalResults.push(transcript)
                setCurrentTranscription(transcript)
                toast.success(`✅ Samsung ASR: "${transcript}"`)
              } else {
                setPartialTranscription(transcript)
              }
            }
            
            if (finalResults.length > 0) {
              clearTimeout(timeout)
              resolve({ matches: finalResults })
            }
          }

          recognition.onerror = (event: any) => {
            console.error('🎤 [Samsung ASR Test] ❌ Web ASR error:', event.error)
            clearTimeout(timeout)
            
            // Detailed error logging for Samsung Galaxy debugging
            const errorInfo = {
              error: event.error,
              hasStarted,
              hasResults,
              finalResults: finalResults.length,
              timestamp: new Date().toISOString()
            }
            
            loggingService.log('error', 'ASR', `Samsung Galaxy ASR error: ${event.error}`, errorInfo)
            
            if (event.error === 'not-allowed') {
              reject(new Error('🎤 Microphone access denied'))
            } else if (event.error === 'service-not-allowed') {
              reject(new Error('🔧 Speech service disabled - check Samsung settings'))
            } else if (event.error === 'language-not-supported') {
              reject(new Error(`🌍 Language ${recognition.lang} not supported`))
            } else {
              reject(new Error(`Samsung ASR error: ${event.error}`))
            }
          }

          recognition.onend = () => {
            console.log('🎤 [Samsung ASR Test] 🏁 Web ASR ended')
            clearTimeout(timeout)
            
            if (hasResults && finalResults.length > 0) {
              resolve({ matches: finalResults })
            } else if (hasStarted) {
              reject(new Error('Samsung ASR ended without capturing speech'))
            }
          }

          try {
            console.log('🎤 [Samsung ASR Test] 🚀 Starting Web ASR...')
            recognition.start()
          } catch (startError) {
            clearTimeout(timeout)
            console.error('🎤 [Samsung ASR Test] ❌ Failed to start Web ASR:', startError)
            reject(startError)
          }
        })
      }

      // Step 5: Process results
      if (result && result.matches && result.matches.length > 0) {
        console.log('🎤 [Samsung ASR Test] ✅ Final success:', result)
        
        const debugResult = {
          timestamp: new Date().toISOString(),
          success: true,
          results: result.matches,
          platform: Capacitor.getPlatform(),
          method: hasCapacitorASR ? 'Capacitor' : 'Web',
          duration: Date.now() - startTime
        }
        
        setLastASRResults(prev => [debugResult, ...prev.slice(0, 4)])
        setAsrDebugInfo(debugResult)
        
        toast.success(`✅ Samsung Galaxy ASR Success! Got ${result.matches.length} results`)
        loggingService.log('info', 'ASR', 'Samsung Galaxy ASR test completed successfully', debugResult)
      } else {
        throw new Error('No speech recognition methods available or all failed')
      }

    } catch (error) {
      console.error('🎤 [Samsung ASR Test] ❌ Test failed:', error)
      
      const errorResult = {
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message,
        platform: Capacitor.getPlatform(),
        duration: Date.now() - startTime
      }
      
      setLastASRResults(prev => [errorResult, ...prev.slice(0, 4)])
      setAsrDebugInfo(errorResult)
      
      toast.error(`❌ Samsung ASR failed: ${error.message}`)
      loggingService.log('error', 'ASR', 'Samsung Galaxy ASR test failed', errorResult)
    } finally {
      // Ensure minimum visualization time for proper debugging
      const elapsed = Date.now() - startTime
      const remainingTime = Math.max(0, minVisualizationTime - elapsed)
      
      console.log(`🎤 [Samsung ASR Test] Elapsed: ${elapsed}ms, Remaining: ${remainingTime}ms`)
      
      if (remainingTime > 0) {
        console.log(`🎤 [Samsung ASR Test] Keeping visualization for ${remainingTime}ms more...`)
        setTimeout(() => {
          setIsListeningASR(false)
          setIsTestingASR(false)
        }, remainingTime)
      } else {
        setIsListeningASR(false)
        setIsTestingASR(false)
      }
    }
  }

  const refreshLogs = () => {
    const currentLogs = loggingService.getLogs()
    setLogs(currentLogs.map(log => `[${log.timestamp}] ${log.level}: ${log.message} ${log.details ? JSON.stringify(log.details) : ''}`))
    toast.success('Logs refreshed')
    // Auto-scroll to bottom after refresh
    setTimeout(scrollToBottom, 100)
  }

  const clearLogs = () => {
    loggingService.clearLogs()
    setLogs([])
    toast.success('Logs cleared')
  }

  const generateLogReport = async () => {
    const timestamp = new Date().toISOString()
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine,
      screen: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      capacitorPlatform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform()
    }

    // Use the logging service's export method for comprehensive logs
    const baseReport = await loggingService.exportLogs('txt')
    
    const connectivityReport = localConnectivity ? `

=== OLLAMA CONNECTIVITY TEST RESULTS ===
Platform: ${localConnectivity.platform || 'Unknown'}
Connected: ${localConnectivity.connected ? 'YES' : 'NO'}
Working URL: ${localConnectivity.workingUrl || 'None'}

Tested URLs:
${localConnectivity.testedUrls ? localConnectivity.testedUrls.map(test => 
  `  ${test.url} - ${test.status}${test.error ? ` (${test.error})` : ''}`
).join('\n') : 'No tests performed'}

Available Models: ${localConnectivity.modelsFound ? localConnectivity.modelsFound.join(', ') : 'None found'}
Preferred Model Available: ${localConnectivity.preferredModelAvailable ? 'YES' : 'NO'}
` : ''

    return baseReport + connectivityReport + `

=== CURRENT SESSION INFO ===
Browser Info: ${deviceInfo.userAgent}
Screen: ${deviceInfo.screen}
Viewport: ${deviceInfo.viewport}
Language: ${deviceInfo.language}
Online: ${deviceInfo.online}

Report generated: ${timestamp}
`
  }

  const downloadLogReport = async () => {
    try {
      const report = await generateLogReport()
      const blob = new Blob([report], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `s24-ai-debug-${Date.now()}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('📁 Log report downloaded!')
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Download failed')
    }
  }

  const copyLogsToClipboard = async () => {
    try {
      const report = await generateLogReport()
      await navigator.clipboard.writeText(report)
      toast.success('📋 Logs copied to clipboard!')
    } catch (error) {
      console.error('Copy failed:', error)
      toast.error('Copy failed - try download instead')
    }
  }

  const shareLogReport = async () => {
    try {
      const report = await generateLogReport()
      
      if (Capacitor.isNativePlatform() && navigator.share) {
        await navigator.share({
          title: 'Samsung S24 Ultra AI Debug Report',
          text: 'Debug logs from AI Companion app',
          files: [new File([report], `s24-ai-debug-${Date.now()}.txt`, { type: 'text/plain' })]
        })
        toast.success('📤 Report shared!')
      } else {
        // Fallback to clipboard
        await copyLogsToClipboard()
      }
    } catch (error) {
      console.error('Share failed:', error)
      // Fallback to download
      await downloadLogReport()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bug className="h-4 w-4" />
          Debug
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[95vw] h-[90vh] max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Bug className="h-4 w-4" />
            Debug Panel - S24 Ultra AI
          </DialogTitle>
          <DialogDescription className="text-xs">
            Debug tools for troubleshooting local AI connectivity
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="connectivity" className="w-full h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 h-8">
            <TabsTrigger value="connectivity" className="text-xs">Connect</TabsTrigger>
            <TabsTrigger value="asr" className="text-xs">ASR Test</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
            <TabsTrigger value="system" className="text-xs">System</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="connectivity" className="space-y-2 h-full overflow-y-auto p-1">
            <Card className="border-thin">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Wifi className="h-4 w-4" />
                  Ollama Test
                </CardTitle>
                <CardDescription className="text-xs">
                  Test local Ollama in Termux
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex gap-2">
                  <Button 
                    onClick={checkOllamaConnectivity} 
                    disabled={isChecking}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                    {isChecking ? 'Testing...' : 'Test Ollama Connection'}
                  </Button>
                </div>

                {localConnectivity && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={localConnectivity.connected ? 'default' : 'destructive'}>
                        {localConnectivity.connected ? '✅ Connected' : '❌ Disconnected'}
                      </Badge>
                    </div>

                    {localConnectivity.platform && (
                      <div>
                        <strong>Platform:</strong> {localConnectivity.platform}
                      </div>
                    )}

                    {localConnectivity.testedUrls && (
                      <div>
                        <strong>Tested URLs:</strong>
                        <div className="mt-2 space-y-1">
                          {localConnectivity.testedUrls.map((test: any, index: number) => (
                            <div key={index} className="text-sm p-2 bg-muted rounded">
                              <span className="font-mono">{test.url}</span>
                              <Badge variant={test.status.includes('✅') ? 'default' : 'destructive'} className="ml-2">
                                {test.status}
                              </Badge>
                              {test.error && <div className="text-red-500 text-xs mt-1">{test.error}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {localConnectivity.workingUrl && (
                      <div>
                        <strong>Working URL:</strong> 
                        <Badge variant="default" className="ml-2">{localConnectivity.workingUrl}</Badge>
                      </div>
                    )}

                    {localConnectivity.modelsFound && (
                      <div>
                        <strong>Available Models:</strong>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {localConnectivity.modelsFound.map((model: string, index: number) => (
                            <Badge key={index} variant="outline">{model}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {localConnectivity.preferredModelAvailable !== undefined && (
                      <div>
                        <strong>Preferred Model (gemma2:2b):</strong>
                        <Badge 
                          variant={localConnectivity.preferredModelAvailable ? 'default' : 'destructive'}
                          className="ml-2"
                        >
                          {localConnectivity.preferredModelAvailable ? 'Available' : 'Not Found'}
                        </Badge>
                      </div>
                    )}

                    {localConnectivity.error && (
                      <div className="text-red-500">
                        <strong>Error:</strong> {localConnectivity.error}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Termux Setup Guide */}
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  🐧 Termux Ollama Setup Guide
                </CardTitle>
                <CardDescription className="text-orange-700">
                  Instructions for fixing Ollama connectivity in Termux on Samsung S24 Ultra
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-semibold text-orange-800">Current Issue:</h4>
                  <p className="text-orange-700">
                    Your Ollama is running in Termux but bound to localhost only. Android apps can't access localhost from external processes.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-orange-800">Solution:</h4>
                  <div className="bg-black text-green-400 p-3 rounded font-mono text-xs space-y-1">
                    <div># Stop current Ollama if running</div>
                    <div>pkill ollama</div>
                    <div></div>
                    <div># Start Ollama bound to all interfaces</div>
                    <div>OLLAMA_HOST=0.0.0.0:11434 ollama serve</div>
                    <div></div>
                    <div># OR use your specific WiFi IP:</div>
                    <div>OLLAMA_HOST=172.16.31.157:11434 ollama serve</div>
                    <div></div>
                    <div># In another Termux session, verify:</div>
                    <div>curl http://172.16.31.157:11434/api/tags</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-orange-800">Alternative (if above doesn't work):</h4>
                  <div className="bg-black text-green-400 p-3 rounded font-mono text-xs space-y-1">
                    <div># Try different port</div>
                    <div>OLLAMA_HOST=0.0.0.0:8080 ollama serve</div>
                    <div></div>
                    <div># Or use specific IP (check with: ip addr)</div>
                    <div>OLLAMA_HOST=192.168.1.XXX:11434 ollama serve</div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                  <h4 className="font-semibold text-blue-800 mb-2">After changing Ollama binding:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700 text-xs">
                    <li>Click "Test Ollama Connection" button above</li>
                    <li>The app will try multiple network addresses</li>
                    <li>Look for ✅ success in the tested URLs</li>
                    <li>Once connected, the "Local AI Offline" badge should disappear</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
            </TabsContent>

            <TabsContent value="asr" className="space-y-2 h-full overflow-y-auto p-1">
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Mic className="h-4 w-4" />
                      Samsung Galaxy ASR Test
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsVisualizationVisible(!isVisualizationVisible)}
                      className="gap-1"
                    >
                      {isVisualizationVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isVisualizationVisible && (
                    <div className="flex flex-col items-center space-y-2">
                      <AudioVisualization 
                        isListening={isListeningASR}
                        color="#10b981"
                        size="medium"
                        type="wave"
                      />
                      <div className="text-xs text-green-700 text-center">
                        {asrVolume > 0 ? `🎤 Voice Level: ${Math.round(asrVolume)}%` : '🎤 Speak clearly into microphone'}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ASR Control Panel */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">ASR Testing Controls</CardTitle>
                  <CardDescription className="text-xs">
                    Comprehensive Samsung Galaxy speech recognition testing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Button 
                      onClick={testSamsungASR}
                      disabled={isTestingASR}
                      className="gap-2 flex-1"
                      variant="default"
                    >
                      <Mic className={`h-4 w-4 ${isListeningASR ? 'animate-pulse' : ''}`} />
                      {isTestingASR ? 'Testing...' : 'Test Samsung ASR'}
                    </Button>
                    <Button 
                      onClick={() => {
                        setCurrentTranscription('')
                        setPartialTranscription('')
                        setTranscriptionHistory([])
                        setLastASRResults([])
                        setAsrDebugInfo(null)
                      }}
                      variant="outline"
                      size="sm"
                      className="gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Clear
                    </Button>
                  </div>

                  {/* Current Status */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium">Status:</div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={isTestingASR ? "default" : "secondary"}>
                        {isTestingASR ? '🔄 Testing' : '⏸️ Idle'}
                      </Badge>
                      <Badge variant={isListeningASR ? "default" : "secondary"}>
                        {isListeningASR ? '👂 Listening' : '🔇 Silent'}
                      </Badge>
                      <Badge variant={Capacitor.isNativePlatform() ? "default" : "outline"}>
                        {Capacitor.isNativePlatform() ? '📱 Native' : '🌐 Web'}
                      </Badge>
                    </div>
                  </div>

                  {/* Real-time Transcription */}
                  {(currentTranscription || partialTranscription) && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium">Live Transcription:</div>
                      <div className="p-2 bg-muted rounded text-sm min-h-[60px] break-words overflow-wrap-anywhere">
                        {currentTranscription && (
                          <div className="font-medium text-green-700 break-words whitespace-pre-wrap">
                            Final: "{currentTranscription}"
                          </div>
                        )}
                        {partialTranscription && (
                          <div className="text-orange-600 italic break-words whitespace-pre-wrap">
                            Partial: "{partialTranscription}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ASR Debug Info */}
                  {asrDebugInfo && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium">Last Test Result:</div>
                      <div className="p-2 bg-muted rounded text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>Success: {asrDebugInfo.success ? '✅' : '❌'}</div>
                          <div>Platform: {asrDebugInfo.platform}</div>
                          <div>Method: {asrDebugInfo.method || 'N/A'}</div>
                          <div>Duration: {asrDebugInfo.duration}ms</div>
                        </div>
                        {asrDebugInfo.results && (
                          <div className="mt-2 break-words whitespace-pre-wrap">
                            Results: {asrDebugInfo.results.join(', ')}
                          </div>
                        )}
                        {asrDebugInfo.error && (
                          <div className="mt-2 text-red-600 break-words whitespace-pre-wrap">
                            Error: {asrDebugInfo.error}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Test History */}
                  {lastASRResults.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium">Recent Tests:</div>
                      <ScrollArea className="h-32 w-full border rounded p-2">
                        <div className="space-y-1">
                          {lastASRResults.map((result, index) => (
                            <div key={index} className="text-xs p-1 bg-muted rounded">
                              <div className="flex justify-between">
                                <span>{result.success ? '✅' : '❌'}</span>
                                <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                              </div>
                              {result.results && (
                                <div className="text-green-600 break-words whitespace-pre-wrap text-xs">
                                  "{result.results[0]}"
                                </div>
                              )}
                              {result.error && (
                                <div className="text-red-600 break-words whitespace-pre-wrap text-xs">
                                  {result.error}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="h-full flex flex-col p-1">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle>Application Logs</CardTitle>
                <CardDescription>
                  View detailed logs for debugging connectivity and performance issues
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                <div className="flex flex-wrap gap-2 flex-shrink-0">
                  <Button onClick={refreshLogs} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button onClick={clearLogs} variant="outline" size="sm">
                    Clear Logs
                  </Button>
                  <Button onClick={scrollToBottom} variant="outline" size="sm" className="gap-2">
                    <Activity className="h-4 w-4" />
                    Scroll to Bottom
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                  <Button onClick={downloadLogReport} variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Save
                  </Button>
                  <Button onClick={copyLogsToClipboard} variant="outline" size="sm" className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  {Capacitor.isNativePlatform() && (
                    <Button onClick={shareLogReport} variant="outline" size="sm" className="gap-2">
                      <Share className="h-4 w-4" />
                      Share
                    </Button>
                  )}
                </div>
                
                <ScrollArea ref={scrollAreaRef} className="flex-1 w-full border rounded min-h-0" style={{ height: 'calc(100vh - 400px)', maxHeight: '600px' }}>
                  <div className="p-4">
                    {logs.length === 0 ? (
                      <div className="text-muted-foreground text-center py-8">
                        No logs available. Start using the app to generate logs.
                      </div>
                    ) : (
                      <div className="space-y-1 pb-4">
                        {logs.map((log, index) => {
                          // Determine log level for color coding
                          const isError = log.includes('error:') || log.includes('ERROR:')
                          const isWarning = log.includes('warn:') || log.includes('WARNING:')
                          const isInfo = log.includes('info:') || log.includes('INFO:')
                          const isSuccess = log.includes('success') || log.includes('✅')
                          
                          let borderColor = 'border-muted'
                          let bgColor = 'hover:bg-muted/50'
                          
                          if (isError) {
                            borderColor = 'border-red-300'
                            bgColor = 'hover:bg-red-50/50'
                          } else if (isWarning) {
                            borderColor = 'border-orange-300'
                            bgColor = 'hover:bg-orange-50/50'
                          } else if (isSuccess) {
                            borderColor = 'border-green-300'
                            bgColor = 'hover:bg-green-50/50'
                          } else if (isInfo) {
                            borderColor = 'border-blue-300'
                            bgColor = 'hover:bg-blue-50/50'
                          }
                          
                          return (
                            <div 
                              key={index} 
                              className={`text-xs font-mono leading-relaxed break-all overflow-wrap-anywhere hyphens-auto p-2 rounded ${bgColor} border-l-3 ${borderColor} transition-colors`}
                              style={{ 
                                wordBreak: 'break-word',
                                overflowWrap: 'anywhere',
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word'
                              }}
                            >
                              {log}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            </TabsContent>

            <TabsContent value="system" className="space-y-2 h-full overflow-y-auto p-1">
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>
                  Device and environment information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <strong>User Agent:</strong>
                  <div className="text-sm text-muted-foreground break-all">
                    {navigator.userAgent}
                  </div>
                </div>
                <Separator />
                <div>
                  <strong>Platform:</strong> {navigator.platform}
                </div>
                <div>
                  <strong>Online Status:</strong> {navigator.onLine ? 'Online' : 'Offline'}
                </div>
                <div>
                  <strong>Language:</strong> {navigator.language}
                </div>
                <div>
                  <strong>Screen:</strong> {screen.width} x {screen.height}
                </div>
                <div>
                  <strong>Viewport:</strong> {window.innerWidth} x {window.innerHeight}
                </div>
              </CardContent>
            </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default DebugPanel
