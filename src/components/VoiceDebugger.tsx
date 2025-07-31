import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface VoiceDebuggerProps {
  isOpen: boolean
  onClose: () => void
}

export default function VoiceDebugger({ isOpen, onClose }: VoiceDebuggerProps) {
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown')
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(false)
  const [speechSynthesisAvailable, setSpeechSynthesisAvailable] = useState(false)
  const [testResults, setTestResults] = useState<string[]>([])
  const [isTestingMic, setIsTestingMic] = useState(false)
  const [isTestingRecognition, setIsTestingRecognition] = useState(false)
  const [isTestingSynthesis, setIsTestingSynthesis] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    if (!isOpen) return

    // Check initial capabilities
    checkCapabilities()
    
    return () => {
      cleanup()
    }
  }, [isOpen])

  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
  }

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const checkCapabilities = async () => {
    addTestResult('🔍 Checking browser capabilities...')
    
    // Check Speech Recognition
    const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    setSpeechRecognitionAvailable(hasSpeechRecognition)
    addTestResult(`🗣️ Speech Recognition: ${hasSpeechRecognition ? '✅ Available' : '❌ Not Available'}`)
    
    // Test language auto-detection
    if (hasSpeechRecognition) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const testRec = new SpeechRecognition()
        addTestResult(`✅ Speech Recognition object created successfully`)
        addTestResult(`🌐 Browser language: ${navigator.language}`)
        addTestResult(`🌍 Available languages: ${navigator.languages.slice(0, 3).join(', ')}`)
        addTestResult(`🎤 Default recognition lang: ${testRec.lang || 'auto-detect'}`)
      } catch (error) {
        addTestResult(`⚠️ Speech Recognition test failed: ${error}`)
      }
    }
    
    // Check Speech Synthesis
    const hasSpeechSynthesis = 'speechSynthesis' in window
    setSpeechSynthesisAvailable(hasSpeechSynthesis)
    addTestResult(`🔊 Speech Synthesis: ${hasSpeechSynthesis ? '✅ Available' : '❌ Not Available'}`)
    
    // Check microphone permission
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      setMicPermission(result.state as 'granted' | 'denied')
      addTestResult(`🎤 Microphone Permission: ${result.state}`)
    } catch (error) {
      addTestResult(`🎤 Could not check microphone permission: ${error}`)
    }
    
    // Browser info
    const userAgent = navigator.userAgent
    const isChrome = userAgent.includes('Chrome')
    const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome')
    const isFirefox = userAgent.includes('Firefox')
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    
    addTestResult(`🌐 Browser: ${isChrome ? 'Chrome' : isSafari ? 'Safari' : isFirefox ? 'Firefox' : 'Other'}`)
    addTestResult(`📱 Platform: ${isMobile ? 'Mobile' : 'Desktop'}`)
  }

  const testMicrophone = async () => {
    setIsTestingMic(true)
    addTestResult('🎤 Testing microphone access...')
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      addTestResult('✅ Microphone access granted')
      setMicPermission('granted')
      
      // Test audio levels
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const microphone = audioContextRef.current.createMediaStreamSource(stream)
      microphone.connect(analyserRef.current)
      
      analyserRef.current.fftSize = 256
      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      addTestResult('🔊 Monitoring audio levels for 5 seconds...')
      toast.info('🎤 Speak into your microphone for 5 seconds')
      
      let maxLevel = 0
      const startTime = Date.now()
      
      const checkAudio = () => {
        if (!analyserRef.current) return
        
        analyserRef.current.getByteFrequencyData(dataArray)
        const sum = dataArray.reduce((a, b) => a + b, 0)
        const average = sum / dataArray.length
        const level = (average / 255) * 100
        
        setAudioLevel(level)
        maxLevel = Math.max(maxLevel, level)
        
        if (Date.now() - startTime < 5000) {
          animationRef.current = requestAnimationFrame(checkAudio)
        } else {
          addTestResult(`📊 Max audio level detected: ${maxLevel.toFixed(1)}%`)
          if (maxLevel > 5) {
            addTestResult('✅ Microphone is detecting audio input')
            toast.success('🎤 Microphone is working!')
          } else {
            addTestResult('⚠️ Very low or no audio detected')
            toast.warning('🎤 Low audio levels - check microphone')
          }
          
          stream.getTracks().forEach(track => track.stop())
          setIsTestingMic(false)
          setAudioLevel(0)
        }
      }
      
      checkAudio()
      
    } catch (error) {
      addTestResult(`❌ Microphone test failed: ${error}`)
      setMicPermission('denied')
      setIsTestingMic(false)
      toast.error('🎤 Microphone test failed')
    }
  }

  const testSpeechRecognition = async () => {
    if (!speechRecognitionAvailable) {
      addTestResult('❌ Speech Recognition not available')
      return
    }
    
    setIsTestingRecognition(true)
    addTestResult('🗣️ Testing speech recognition...')
    
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      
      // Use best available English language instead of forcing en-US
      const availableLanguages = navigator.languages
      const englishLang = availableLanguages.find(lang => lang.startsWith('en')) || 'en'
      
      recognition.lang = englishLang
      addTestResult(`🌐 Using best available English: ${englishLang}`)
      addTestResult(`🌍 Browser languages: ${navigator.languages.slice(0, 3).join(', ')}`)
      
      recognition.onstart = () => {
        addTestResult('🎤 Speech recognition started - say something!')
        toast.info('🗣️ Say something for 3 seconds...')
      }
      
      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1]
        const transcript = result[0].transcript
        const confidence = result[0].confidence || 0
        
        if (result.isFinal) {
          addTestResult(`✅ Recognized: "${transcript}" (${Math.round(confidence * 100)}% confident)`)
          toast.success(`🗣️ Heard: "${transcript}"`)
        } else {
          addTestResult(`🔄 Interim: "${transcript}"`)
        }
      }
      
      recognition.onerror = (event) => {
        addTestResult(`❌ Speech recognition error: ${event.error}`)
        toast.error(`🗣️ Error: ${event.error}`)
        setIsTestingRecognition(false)
      }
      
      recognition.onend = () => {
        addTestResult('🛑 Speech recognition ended')
        setIsTestingRecognition(false)
      }
      
      recognition.start()
      
      // Auto-stop after 5 seconds
      setTimeout(() => {
        try {
          recognition.stop()
        } catch (e) {
          // Ignore errors during stop
        }
      }, 5000)
      
    } catch (error) {
      addTestResult(`❌ Speech recognition setup failed: ${error}`)
      setIsTestingRecognition(false)
      toast.error('🗣️ Speech recognition setup failed')
    }
  }

  const testSpeechSynthesis = async () => {
    if (!speechSynthesisAvailable) {
      addTestResult('❌ Speech Synthesis not available')
      return
    }
    
    setIsTestingSynthesis(true)
    addTestResult('🔊 Testing speech synthesis...')
    
    try {
      const synth = window.speechSynthesis
      const utterance = new SpeechSynthesisUtterance('Hello! This is a test of the speech synthesis system.')
      
      utterance.rate = 0.9
      utterance.pitch = 1.1
      utterance.volume = 0.8
      
      // Try to find a British voice first, then fallback to default
      const voices = synth.getVoices()
      const britishVoice = voices.find(voice => 
        voice.lang.includes('en-GB') || 
        voice.name.includes('British') ||
        voice.name.includes('Daniel') ||
        voice.name.includes('Kate')
      )
      
      if (britishVoice) {
        utterance.voice = britishVoice
        utterance.lang = britishVoice.lang
        addTestResult(`🇬🇧 Using British voice: ${britishVoice.name} (${britishVoice.lang})`)
      } else {
        // Use system default voice and language
        const defaultVoice = voices.find(voice => voice.default) || voices[0]
        if (defaultVoice) {
          utterance.voice = defaultVoice
          utterance.lang = defaultVoice.lang
          addTestResult(`🗣️ Using default voice: ${defaultVoice.name} (${defaultVoice.lang})`)
        } else {
          addTestResult(`🗣️ Using browser default voice settings`)
        }
      }
      
      utterance.onstart = () => {
        addTestResult('🔊 Speech synthesis started')
        toast.info('🔊 Listen for the test message...')
      }
      
      utterance.onend = () => {
        addTestResult('✅ Speech synthesis completed')
        toast.success('🔊 Speech synthesis test completed')
        setIsTestingSynthesis(false)
      }
      
      utterance.onerror = (event) => {
        addTestResult(`❌ Speech synthesis error: ${event.error}`)
        toast.error(`🔊 Error: ${event.error}`)
        setIsTestingSynthesis(false)
      }
      
      synth.speak(utterance)
      
    } catch (error) {
      addTestResult(`❌ Speech synthesis failed: ${error}`)
      setIsTestingSynthesis(false)
      toast.error('🔊 Speech synthesis failed')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto cute-card">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Voice System Debugger</h2>
            <Button onClick={onClose} variant="outline">Close</Button>
          </div>
          
          {/* Status Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">System Status</h3>
              <div className="space-y-1">
                <Badge variant={micPermission === 'granted' ? 'default' : 'destructive'}>
                  🎤 Microphone: {micPermission}
                </Badge>
                <Badge variant={speechRecognitionAvailable ? 'default' : 'destructive'}>
                  🗣️ Speech Recognition: {speechRecognitionAvailable ? 'Available' : 'Not Available'}
                </Badge>
                <Badge variant={speechSynthesisAvailable ? 'default' : 'destructive'}>
                  🔊 Speech Synthesis: {speechSynthesisAvailable ? 'Available' : 'Not Available'}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Audio Level</h3>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(100, audioLevel)}%` }}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {audioLevel.toFixed(1)}% {isTestingMic ? '(Live)' : ''}
              </div>
            </div>
          </div>
          
          {/* Test Buttons */}
          <div className="grid grid-cols-3 gap-4">
            <Button
              onClick={testMicrophone}
              disabled={isTestingMic}
              variant="outline"
              className="h-16"
            >
              {isTestingMic ? '🎤 Testing...' : '🎤 Test Microphone'}
            </Button>
            
            <Button
              onClick={testSpeechRecognition}
              disabled={isTestingRecognition || !speechRecognitionAvailable}
              variant="outline"
              className="h-16"
            >
              {isTestingRecognition ? '🗣️ Testing...' : '🗣️ Test Recognition'}
            </Button>
            
            <Button
              onClick={testSpeechSynthesis}
              disabled={isTestingSynthesis || !speechSynthesisAvailable}
              variant="outline"
              className="h-16"
            >
              {isTestingSynthesis ? '🔊 Testing...' : '🔊 Test Synthesis'}
            </Button>
          </div>
          
          {/* Test Results */}
          <div className="space-y-2">
            <h3 className="font-semibold">Test Results</h3>
            <div className="bg-muted p-4 rounded-lg max-h-60 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-muted-foreground text-sm">No tests run yet. Click the test buttons above.</p>
              ) : (
                <div className="space-y-1">
                  {testResults.map((result, index) => (
                    <div key={index} className="text-sm font-mono">
                      {result}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p><strong>Tips:</strong></p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Make sure microphone permission is granted</li>
              <li>Chrome and Safari work best for speech features</li>
              <li>Speak clearly and close to the microphone</li>
              <li>Check your system's microphone settings</li>
              <li>For mobile: ensure browser has microphone access</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}