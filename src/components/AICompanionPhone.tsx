import { useState, useEffect, useRef, useCallback } from 'react'
import { Phone, PhoneOff, Volume2, History, Settings, Heart, WifiX, Brain, User, Palette, CloudArrowUp, DeviceMobile, Robot, Bug } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import PersonalitySelection from '@/components/PersonalitySelection'
import ParticleEffects from '@/components/ParticleEffects'
import DrawingCanvas from '@/components/DrawingCanvas'
import AudioVisualization from '@/components/AudioVisualization'
import VoiceDebugger from '@/components/VoiceDebugger'
import { AIPersonality, AI_PERSONALITIES } from '@/types/personality'
import { voiceChatService } from '@/services/VoiceChatService'
import { ollamaService } from '@/services/OllamaService'
import { soundEffectsService } from '@/services/SoundEffectsService'
import { llmService, LLMMode } from '@/services/LLMService'
import { 
  FloatingHearts, 
  TwinklingStars, 
  MagicSparkles, 
  EmojiReaction, 
  PulsingGlow, 
  BreathingAvatar, 
  WigglyIcon,
  ConfettiBurst 
} from '@/components/CuteAnimations'
import { Capacitor } from '@capacitor/core'

interface ConversationEntry {
  id: string
  timestamp: number
  duration: number
  topics: string[]
  personalityId: string
}

type CallState = 'idle' | 'connecting' | 'active' | 'ending'
type AppView = 'phone' | 'history' | 'settings' | 'personality' | 'drawing'

export default function AICompanionPhone() {
  const [callState, setCallState] = useState<CallState>('idle')
  const [currentView, setCurrentView] = useState<AppView>('phone')
  const [isListening, setIsListening] = useState(false)
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [localLLMAvailable, setLocalLLMAvailable] = useState(false)
  const [conversations, setConversations] = useKV<ConversationEntry[]>('conversation-history', [])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [selectedPersonality, setSelectedPersonality] = useKV<AIPersonality>('selected-personality', AI_PERSONALITIES[0])
  const [isDrawingOpen, setIsDrawingOpen] = useState(false)
  const [isNativeApp, setIsNativeApp] = useState(false)
  const [llmMode, setLlmMode] = useKV<LLMMode>('llm-mode', 'cloud')
  const [llmStatus, setLlmStatus] = useState(llmService.getStatus())
  const [isDebuggerOpen, setIsDebuggerOpen] = useState(false)
  
  // Helper function to get the best available English language
  const getBestEnglishLanguage = useCallback(() => {
    const availableLanguages = navigator.languages || [navigator.language]
    const englishLang = availableLanguages.find(lang => lang.startsWith('en')) || 'en'
    console.log('🌍 Available languages:', availableLanguages.slice(0, 3))
    console.log('🗣️ Selected English variant:', englishLang)
    return englishLang
  }, [])
  
  // Animation and sound effect states
  const [showHearts, setShowHearts] = useState(false)
  const [showStars, setShowStars] = useState(false)
  const [showSparkles, setShowSparkles] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [currentEmoji, setCurrentEmoji] = useState('')
  const [showEmojiReaction, setShowEmojiReaction] = useState(false)
  const [lastButtonPressed, setLastButtonPressed] = useState('')
  const [soundEnabled, setSoundEnabled] = useKV('sound-enabled', true)
  
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  // Helper functions for cute animations and sounds
  const playSound = useCallback((soundType: any, volume = 0.7) => {
    if (soundEnabled) {
      try {
        soundEffectsService.play(soundType, volume)
      } catch (error) {
        console.warn('Failed to play sound:', soundType, error)
      }
    }
  }, [soundEnabled])

  const triggerCelebration = useCallback((type: 'hearts' | 'stars' | 'sparkles' | 'confetti' | 'emoji', emoji?: string) => {
    switch (type) {
      case 'hearts':
        setShowHearts(true)
        setTimeout(() => setShowHearts(false), 3000)
        playSound('heart-beat')
        break
      case 'stars':
        setShowStars(true)
        setTimeout(() => setShowStars(false), 3000)
        playSound('magic-sparkle')
        break
      case 'sparkles':
        setShowSparkles(true)
        setTimeout(() => setShowSparkles(false), 3000)
        playSound('magic-sparkle', 0.5)
        break
      case 'confetti':
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3000)
        playSound('success-chime')
        break
      case 'emoji':
        if (emoji) {
          setCurrentEmoji(emoji)
          setShowEmojiReaction(true)
          setTimeout(() => setShowEmojiReaction(false), 2000)
          playSound('pop')
        }
        break
    }
  }, [playSound])

  const handleButtonPress = useCallback((buttonId: string, soundType: any = 'button-tap') => {
    setLastButtonPressed(buttonId)
    playSound(soundType)
    
    // Add visual feedback
    const button = document.getElementById(buttonId)
    if (button) {
      button.classList.add('button-press')
      setTimeout(() => button.classList.remove('button-press'), 150)
    }
  }, [playSound])

  // Configure sound effects service
  useEffect(() => {
    try {
      soundEffectsService.setEnabled(soundEnabled)
    } catch (error) {
      console.warn('Failed to configure sound effects service:', error)
    }
  }, [soundEnabled])

  // Initialize native services if running in Capacitor
  useEffect(() => {
    const initializeNativeServices = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          setIsNativeApp(true)
          await voiceChatService.initializeVoiceServices()
          toast.success('Native voice services initialized!')
        }
      } catch (error) {
        console.error('Failed to initialize native services:', error)
        toast.error('Failed to initialize native services')
      }
    }
    
    initializeNativeServices()
  }, [])

  // Initialize LLM service with saved mode
  useEffect(() => {
    const initializeLLM = async () => {
      try {
        llmService.setMode(llmMode)
        await llmService.checkAvailability()
        setLlmStatus(llmService.getStatus())
      } catch (error) {
        console.error('Failed to initialize LLM service:', error)
        // Continue anyway with fallback status
        setLlmStatus({
          currentLLM: 'fallback',
          cloudAvailable: false,
          localAvailable: false,
          modelInfo: 'Service unavailable'
        })
      }
    }
    initializeLLM()
  }, [llmMode])

  // Update LLM status when network changes
  useEffect(() => {
    try {
      llmService.updateAvailability(isOnline)
      setLlmStatus(llmService.getStatus())
    } catch (error) {
      console.warn('Failed to update LLM availability:', error)
    }
  }, [isOnline])

  // Handle LLM mode change
  const handleLlmModeChange = useCallback(() => {
    const modes: LLMMode[] = ['cloud', 'local', 'auto']
    const currentIndex = modes.indexOf(llmMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    
    setLlmMode(nextMode)
    llmService.setMode(nextMode)
    setLlmStatus(llmService.getStatus())
    
    handleButtonPress('llm-toggle', 'magic-sparkle')
    triggerCelebration('sparkles')
  }, [llmMode, handleButtonPress, triggerCelebration])

  // Generate AI response using the enhanced LLM service
  const generateAIResponse = useCallback(async (userInput: string) => {
    try {
      console.log(`🤖 Generating response using ${llmStatus.currentLLM} LLM...`)
      
      // Use personality-specific prompt template
      const promptTemplate = selectedPersonality.conversationStyle.promptTemplate
      const personalizedPrompt = promptTemplate.replace('{input}', userInput)

      const result = await llmService.generateResponse(personalizedPrompt, selectedPersonality.id)
      
      // Show source indicator
      const sourceEmoji = result.source === 'cloud' ? '☁️' : result.source === 'local' ? '📱' : '💾'
      console.log(`✅ ${sourceEmoji} Response from ${result.source}: ${result.response.substring(0, 50)}...`)
      
      // Update status after successful generation
      setLlmStatus(llmService.getStatus())
      
      return result.response
    } catch (error) {
      console.error('❌ Error generating AI response:', error)
      toast.error('AI response failed. Using fallback response.')
      
      // Fallback to personality-specific responses
      const fallbackResponses = getPersonalityResponse(selectedPersonality.id)
      return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
    }
  }, [selectedPersonality, llmStatus.currentLLM])

  // Handle speech recognition (unified for web and native) - Define this first
  const startListening = useCallback(async () => {
    console.log('🎤 Starting to listen...')
    
    if (isNativeApp && voiceChatService.isNativeVoiceAvailable()) {
      // Use native speech recognition
      setIsListening(true)
      try {
        const transcript = await voiceChatService.startListening()
        if (transcript.trim()) {
          setIsListening(false)
          const aiResponse = await generateAIResponse(transcript)
          await speakResponse(aiResponse)
          
          // Save to conversation
          if (currentConversationId) {
            const timestamp = Date.now()
            // Add conversation logic here
          }
        }
        setIsListening(false)
      } catch (error) {
        console.error('Native speech recognition error:', error)
        setIsListening(false)
        toast.error('Voice recognition failed. Please try again.')
      }
    } else {
      // Use web speech recognition with improved error handling
      if (!recognitionRef.current) {
        console.error('❌ No speech recognition available')
        toast.error('Voice recognition not available in this browser')
        return
      }
      
      try {
        // Stop any existing recognition first
        if (isListening) {
          console.log('⚠️ Already listening, stopping current session first')
          recognitionRef.current.stop()
          await new Promise(resolve => setTimeout(resolve, 300))
        }
        
        // Check microphone permissions before starting
        try {
          console.log('🔍 Checking microphone permissions...')
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          })
          
          // Test if we can get audio data
          const audioContext = new (window.AudioContext || window.webkitAudioContext)()
          const analyser = audioContext.createAnalyser()
          const microphone = audioContext.createMediaStreamSource(stream)
          microphone.connect(analyser)
          
          analyser.fftSize = 256
          const dataArray = new Uint8Array(analyser.frequencyBinCount)
          analyser.getByteFrequencyData(dataArray)
          
          console.log('✅ Microphone stream established, audio levels available')
          
          // Clean up test stream
          audioContext.close()
          stream.getTracks().forEach(track => track.stop())
          
        } catch (permError) {
          console.error('❌ Microphone permission/access failed:', permError)
          toast.error('🎤 Please allow microphone access and ensure microphone is connected.')
          return
        }
        
        console.log('🔄 Starting web speech recognition...')
        console.log('Recognition settings:', {
          continuous: recognitionRef.current.continuous,
          interimResults: recognitionRef.current.interimResults,
          lang: recognitionRef.current.lang,
          maxAlternatives: recognitionRef.current.maxAlternatives
        })
        
        // Set state and start recognition
        setIsListening(true)
        recognitionRef.current.start()
        
        // Auto-timeout to prevent hanging
        setTimeout(() => {
          if (isListening && recognitionRef.current) {
            console.log('⏰ Auto-stopping speech recognition after 10 seconds')
            recognitionRef.current.stop()
          }
        }, 10000)
        
      } catch (error) {
        console.error('❌ Web speech recognition start error:', error)
        setIsListening(false)
        
        // Handle specific errors with better user guidance
        if (error.name === 'InvalidStateError') {
          console.log('⚠️ Speech recognition in invalid state, waiting and retrying...')
          toast.info('🎤 Restarting voice recognition in 2 seconds...')
          // Wait longer before retry
          setTimeout(() => {
            if (callState === 'active' && !aiSpeaking && !isListening) {
              startListening()
            }
          }, 2000)
        } else if (error.name === 'NotAllowedError') {
          toast.error('🎤 Microphone permission denied. Please allow microphone access and refresh.')
        } else if (error.name === 'ServiceNotAllowedError') {
          toast.error('🎤 Speech recognition service not allowed. Please check browser settings.')
        } else if (error.name === 'LanguageNotSupportedError') {
          console.log('⚠️ Language not supported, creating fresh recognition without language constraints...')
          
          // Complete reset - create fresh recognition without any language setting
          try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = false
            recognitionRef.current.interimResults = true
            recognitionRef.current.maxAlternatives = 1
            // Use best available English language to prevent language-not-supported errors
            recognitionRef.current.lang = getBestEnglishLanguage()
            
            // Re-attach all the event handlers
            setupSpeechRecognitionHandlers()
            
            toast.info(`🎤 Reset speech recognition to English (${getBestEnglishLanguage()})...`)
            setTimeout(() => {
              if (callState === 'active' && !aiSpeaking && !isListening) {
                console.log('🔄 Retrying with fresh recognition instance')
                startListening()
              }
            }, 1500)
          } catch (resetError) {
            console.error('❌ Failed to reset speech recognition:', resetError)
            toast.error('🎤 Speech recognition not supported in this environment')
          }
        } else {
          console.error('❌ Unknown speech recognition error:', error)
          toast.error(`🎤 Voice recognition failed: ${error.message}`)
          
          // Retry for unknown errors with longer delay
          setTimeout(() => {
            if (callState === 'active' && !aiSpeaking && !isListening) {
              console.log('🔄 Retrying after unknown error...')
              startListening()
            }
          }, 3000)
        }
      }
    }
  }, [isNativeApp, currentConversationId, callState, aiSpeaking, isListening, generateAIResponse, getBestEnglishLanguage])

  // Speak AI response (unified for web and native)
  const speakResponse = useCallback(async (text: string) => {
    console.log('🤖 Starting to speak:', text.substring(0, 50) + '...')
    
    // Trigger speaking animation and sounds
    playSound('ai-thinking', 0.4)
    triggerCelebration('sparkles')
    setAiSpeaking(true)
    
    if (isNativeApp && voiceChatService.isNativeVoiceAvailable()) {
      // Use native TTS with Samsung S24 Ultra optimizations
      try {
        await voiceChatService.speak(text, selectedPersonality.id)
        setAiSpeaking(false)
        playSound('pop', 0.3)
        
        // Auto-restart listening after speaking finishes
        setTimeout(() => {
          if (callState === 'active' && !isListening) {
            startListening()
          }
        }, 1000)
      } catch (error) {
        console.error('Native TTS error:', error)
        setAiSpeaking(false)
      }
    } else {
      // Use web TTS
      if (!synthRef.current) {
        setAiSpeaking(false)
        return
      }
      
      // Cancel any existing speech
      synthRef.current.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      // Use personality-specific voice settings
      utterance.rate = selectedPersonality.voiceSettings.rate
      utterance.pitch = selectedPersonality.voiceSettings.pitch
      utterance.volume = selectedPersonality.voiceSettings.volume
      
      // Try to use British English voice
      const voices = synthRef.current.getVoices()
      const britishVoice = voices.find(voice => 
        voice.lang.includes('en-GB') || 
        voice.name.includes('British') || 
        voice.name.includes('Daniel') || 
        voice.name.includes('Kate') ||
        voice.name.includes('Female') ||
        voice.name.includes('UK')
      )
      if (britishVoice) {
        utterance.voice = britishVoice
        console.log('🗣️ Using British voice:', britishVoice.name)
      } else {
        console.log('🗣️ Using default voice')
      }
      
      utterance.onstart = () => {
        console.log('🗣️ TTS started speaking')
        setAiSpeaking(true)
        // Different animations based on personality
        if (selectedPersonality.id === 'cheerful-buddy') {
          triggerCelebration('hearts')
        } else if (selectedPersonality.id === 'gentle-friend') {
          triggerCelebration('sparkles')
        } else if (selectedPersonality.id === 'silly-joker') {
          triggerCelebration('emoji', '😄')
        } else if (selectedPersonality.id === 'wise-owl') {
          triggerCelebration('stars')
        } else if (selectedPersonality.id === 'creative-artist') {
          triggerCelebration('confetti')
        }
      }
      
      utterance.onend = () => {
        console.log('✅ TTS finished speaking')
        setAiSpeaking(false)
        playSound('pop', 0.3)
        
        // Auto-restart listening after speaking finishes (with delay)
        setTimeout(() => {
          if (callState === 'active' && !isListening) {
            console.log('🔄 Auto-restarting listening after AI finished speaking')
            startListening()
          }
        }, 1500) // Give a bit more time for the user to process what was said
      }
      
      utterance.onerror = (event) => {
        console.error('❌ TTS error:', event.error)
        setAiSpeaking(false)
        toast.error('Text-to-speech error occurred')
      }
      
      console.log('🗣️ Starting TTS...')
      synthRef.current.speak(utterance)
    }
  }, [selectedPersonality, isNativeApp, playSound, triggerCelebration, callState, isListening, startListening])

  // DISABLED: Force local LLM check - Using new LLM service instead
  useEffect(() => {
    console.log('🔄 Using enhanced LLM service with cloud/local toggle')
    console.log(`Current mode: ${llmMode}, Status: ${JSON.stringify(llmStatus)}`)
  }, [llmMode, llmStatus])

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Back online! AI features available.')
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      toast.info('Offline mode - Limited functionality available.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Initialize speech APIs with enhanced error handling and better language detection
  useEffect(() => {
    const initializeSpeechApis = async () => {
      console.log('🚀 Initializing speech APIs...')
      
      // First check if speech recognition is available
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('❌ Speech recognition not supported in this browser')
        toast.error('🎤 Voice recognition not supported. Please use Chrome, Safari, or Edge.')
        return
      }
      
      try {
        // Request microphone permission early
        console.log('🎤 Requesting microphone permission...')
        toast.info('🎤 Requesting microphone permission...')
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000 // Lower sample rate for better speech recognition
          } 
        })
        
        console.log('✅ Microphone permission granted')
        toast.success('🎤 Microphone permission granted!')
        
        // Quick audio level test
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const analyser = audioContext.createAnalyser()
        const microphone = audioContext.createMediaStreamSource(stream)
        microphone.connect(analyser)
        
        analyser.fftSize = 256
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        
        // Quick test for audio input
        let hasAudio = false
        for (let i = 0; i < 10; i++) {
          analyser.getByteFrequencyData(dataArray)
          const sum = dataArray.reduce((a, b) => a + b, 0)
          if (sum > 0) {
            hasAudio = true
            break
          }
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        // Clean up test stream
        audioContext.close()
        stream.getTracks().forEach(track => track.stop())
        
        if (hasAudio) {
          console.log('✅ Microphone working')
          toast.success('🎤 Microphone is working!')
        } else {
          console.log('⚠️ No audio detected during test')
          toast.warning('🎤 Microphone connected but no audio detected. Please check your microphone.')
        }
        
      } catch (error) {
        console.error('❌ Microphone access error:', error)
        if (error.name === 'NotAllowedError') {
          toast.error('🎤 Microphone access denied. Please allow microphone access and refresh the page.')
        } else if (error.name === 'NotFoundError') {
          toast.error('🎤 No microphone found. Please connect a microphone and refresh.')
        } else {
          toast.error('🎤 Microphone error: ' + error.message)
        }
        return
      }
      
      // Initialize speech recognition with language fallback
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        
        // Configure speech recognition for better reliability
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = true
        recognitionRef.current.maxAlternatives = 1
        
        // Force English language for better compatibility
        console.log('🗣️ Setting speech recognition to English')
        console.log('🌐 Navigator language:', navigator.language)
        console.log('🌍 Available languages:', navigator.languages)
        
        // Use best available English language for better compatibility
        const bestEnglishLang = getBestEnglishLanguage()
        recognitionRef.current.lang = bestEnglishLang
        let supportedLang = `${bestEnglishLang} (auto-detected English)`
        
        toast.success(`🗣️ Voice recognition ready (${supportedLang})`)
        
        console.log('🎤 Speech recognition configured:', {
          continuous: recognitionRef.current.continuous,
          interimResults: recognitionRef.current.interimResults,
          lang: recognitionRef.current.lang,
          maxAlternatives: recognitionRef.current.maxAlternatives
        })
        
      } catch (error) {
        console.error('❌ Failed to initialize speech recognition:', error)
        toast.error('🎤 Speech recognition setup failed: ' + error.message)
        return
      }
        
      // Initialize speech synthesis
      try {
        synthRef.current = window.speechSynthesis
        
        // Wait for voices to load
        const loadVoices = () => {
          return new Promise<void>((resolve) => {
            const voices = synthRef.current?.getVoices() || []
            if (voices.length > 0) {
              console.log('✅ Speech synthesis voices available:', voices.length)
              
              // Find British voices for better experience
              const britishVoices = voices.filter(voice => 
                voice.lang.includes('en-GB') ||
                voice.name.toLowerCase().includes('british') ||
                voice.name.toLowerCase().includes('daniel') ||
                voice.name.toLowerCase().includes('kate')
              )
              
              if (britishVoices.length > 0) {
                console.log('🇬🇧 British voices found:', britishVoices.map(v => v.name))
                toast.success('🗣️ British voice available!')
              } else {
                console.log('🗣️ Using default voice (no British voice found)')
                toast.info('🗣️ Text-to-speech ready (default voice)')
              }
              
              resolve()
            } else {
              console.log('⏳ Waiting for voices to load...')
              const onVoicesChanged = () => {
                const newVoices = synthRef.current?.getVoices() || []
                if (newVoices.length > 0) {
                  console.log('✅ Speech synthesis voices loaded after wait:', newVoices.length)
                  synthRef.current?.removeEventListener('voiceschanged', onVoicesChanged)
                  resolve()
                }
              }
              
              synthRef.current?.addEventListener('voiceschanged', onVoicesChanged)
              
              // Timeout after 3 seconds
              setTimeout(() => {
                synthRef.current?.removeEventListener('voiceschanged', onVoicesChanged)
                console.log('⚠️ Voice loading timeout, continuing anyway')
                resolve()
              }, 3000)
            }
          })
        }
        
        await loadVoices()
        
      } catch (error) {
        console.error('❌ Failed to initialize speech synthesis:', error)
        toast.error('🗣️ Text-to-speech setup failed: ' + error.message)
      }
    }
    
    initializeSpeechApis()
    
    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      console.log('🚀 Speech API initialization complete')
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Call timer management
  useEffect(() => {
    if (callState === 'active') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
        callTimerRef.current = null
      }
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
        callTimerRef.current = null
      }
    }
  }, [callState])

  // Format call duration
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Get personality-based responses
  const getPersonalityResponse = (personalityId: string): string[] => {
    switch (personalityId) {
      case 'cheerful-friend':
        return [
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
          "That sounds brilliant! I'd love to hear more."
        ]
    }
  }

  // Helper function to set up speech recognition event handlers
  const setupSpeechRecognitionHandlers = useCallback(() => {
    if (!recognitionRef.current) return

    recognitionRef.current.onresult = async (event) => {
      console.log('🎤 Speech recognition result received, results count:', event.results.length)
      
      // Process all results for better feedback
      let finalTranscript = ''
      let interimTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript.trim()
        const confidence = result[0].confidence || 0
        
        if (result.isFinal) {
          finalTranscript += transcript
          console.log('📝 Final transcript:', transcript, 'Confidence:', confidence)
        } else {
          interimTranscript += transcript
          console.log('🔄 Interim transcript:', transcript)
        }
      }
      
      // Show interim results for user feedback
      if (interimTranscript && interimTranscript.length > 3) {
        toast.info(`🎤 Hearing: "${interimTranscript.substring(0, 30)}..."`, {
          duration: 1000,
          id: 'interim-speech'
        })
      }
      
      // Process final result
      if (finalTranscript && finalTranscript.length > 2) {
        console.log('✅ Processing final speech input:', finalTranscript)
        setIsListening(false)
        
        triggerCelebration('emoji', '💬')
        playSound('success-chime')
        
        try {
          const aiResponse = await generateAIResponse(finalTranscript)
          await speakResponse(aiResponse)
          
          // Update conversation history
          if (currentConversationId && conversations) {
            setConversations((current) => {
              const conversation = current.find(c => c.id === currentConversationId)
              if (conversation) {
                // Add to topics (simple keyword extraction)
                const words = finalTranscript.toLowerCase().split(' ')
                const newTopics = words.filter(word => 
                  word.length > 4 && 
                  !['that', 'this', 'with', 'they', 'have', 'were', 'been', 'from', 'would', 'could'].includes(word)
                ).slice(0, 3)
                
                conversation.topics = [...new Set([...conversation.topics, ...newTopics])].slice(0, 10)
                conversation.duration = callDuration
              }
              return [...current]
            })
          }
        } catch (error) {
          console.error('❌ Error processing speech result:', error)
          setIsListening(false)
          toast.error('🤖 AI response failed. Please try again.')
        }
      } else if (finalTranscript.length <= 2) {
        console.log('⚠️ Speech too short, ignoring:', finalTranscript)
        setIsListening(false)
        
        // Auto-restart listening for very short or unclear speech
        setTimeout(() => {
          if (callState === 'active' && !aiSpeaking && !isListening) {
            console.log('🔄 Auto-restarting after short speech')
            startListening()
          }
        }, 1500)
      }
    }

    recognitionRef.current.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error)
      setIsListening(false)
      
      // Enhanced error handling with specific user guidance
      switch (event.error) {
        case 'no-speech':
          console.log('ℹ️ No speech detected')
          toast.info('🎤 No speech heard. Try speaking louder or closer to microphone.')
          // Auto-restart after no-speech with a longer delay
          setTimeout(() => {
            if (callState === 'active' && !aiSpeaking && !isListening) {
              console.log('🔄 Restarting after no-speech with user guidance')
              toast.info('🎤 Ready to listen again - speak when you see this message')
              startListening()
            }
          }, 3000)
          break
          
        case 'audio-capture':
          console.error('❌ Audio capture failed - microphone issue')
          toast.error('🎤 Microphone access issue. Please check your microphone connection and refresh.')
          break
          
        case 'not-allowed':
          console.error('❌ Microphone permission denied')
          toast.error('🎤 Microphone permission denied. Please allow access and refresh the page.')
          break
          
        case 'network':
          console.error('❌ Network error during speech recognition')
          toast.error('🌐 Network error. Please check your internet connection.')
          setTimeout(() => {
            if (callState === 'active' && !aiSpeaking && !isListening) {
              console.log('🔄 Retrying after network error')
              startListening()
            }
          }, 4000)
          break
          
        case 'service-not-allowed':
          console.error('❌ Speech recognition service not allowed')
          toast.error('🎤 Speech recognition blocked. Please check browser settings.')
          break
          
        case 'language-not-supported':
          console.error('❌ Language not supported, creating fresh recognition...')
          toast.info('🎤 Language issue detected - forcing English language...')
          // Create completely fresh recognition with English language
          setTimeout(() => {
            try {
              const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
              recognitionRef.current = new SpeechRecognition()
              recognitionRef.current.continuous = false
              recognitionRef.current.interimResults = true
              recognitionRef.current.maxAlternatives = 1
              // Use best available English language to prevent language errors
              recognitionRef.current.lang = getBestEnglishLanguage()
              
              setupSpeechRecognitionHandlers() // Re-setup handlers
              
              if (callState === 'active' && !aiSpeaking && !isListening) {
                console.log('🔄 Retrying with fresh recognition (no language set)')
                startListening()
              }
            } catch (resetError) {
              console.error('❌ Failed to create fresh recognition:', resetError)
              toast.error('🎤 Speech recognition not supported in this browser')
            }
          }, 2000)
          break
          
        case 'aborted':
          console.log('ℹ️ Speech recognition aborted (normal during cleanup)')
          break
          
        default:
          console.error('❌ Unknown speech recognition error:', event.error)
          toast.error(`🎤 Voice error: ${event.error}. Retrying in 3 seconds...`)
          setTimeout(() => {
            if (callState === 'active' && !aiSpeaking && !isListening) {
              console.log('🔄 Retrying after unknown error')
              startListening()
            }
          }, 3000)
          break
      }
    }

    recognitionRef.current.onstart = () => {
      console.log('🎤 Speech recognition started')
      setIsListening(true)
      playSound('gentle-chime', 0.3)
      triggerCelebration('emoji', '👂')
    }

    recognitionRef.current.onend = () => {
      console.log('🎤 Speech recognition ended')
      setIsListening(false)
      
      // Auto-restart if we're still in an active call and not speaking
      if (callState === 'active' && !aiSpeaking) {
        setTimeout(() => {
          if (callState === 'active' && !aiSpeaking && !isListening) {
            console.log('🔄 Auto-restarting speech recognition')
            startListening()
          }
        }, 2000)
      }
    }

    recognitionRef.current.onspeechstart = () => {
      console.log('🗣️ Speech start detected')
      triggerCelebration('emoji', '🎵')
    }

    recognitionRef.current.onspeechend = () => {
      console.log('🗣️ Speech end detected')
    }

    recognitionRef.current.onsoundstart = () => {
      console.log('🔊 Sound detected')
    }

    recognitionRef.current.onsoundend = () => {
      console.log('🔇 Sound ended')
    }

    recognitionRef.current.onaudiostart = () => {
      console.log('🎧 Audio start')
    }

    recognitionRef.current.onaudioend = () => {
      console.log('🎧 Audio end')
    }

    recognitionRef.current.onnomatch = () => {
      console.log('🤷 No match found')
      toast.info('🎤 Didn\'t catch that. Please speak clearly and try again.')
      
      setTimeout(() => {
        if (callState === 'active' && !aiSpeaking && !isListening) {
          console.log('🔄 Restarting after no match')
          startListening()
        }
      }, 2000)
    }
  }, [callState, aiSpeaking, isListening, generateAIResponse, speakResponse, currentConversationId, conversations, callDuration, triggerCelebration, playSound, startListening])

  // Handle speech recognition with enhanced debugging and feedback
  useEffect(() => {
    if (isNativeApp) return // Skip web speech setup for native app
    
    if (!recognitionRef.current) {
      console.log('⚠️ No speech recognition available')
      return
    }

    setupSpeechRecognitionHandlers()
  }, [isNativeApp, setupSpeechRecognitionHandlers])

  // Legacy effect - can be removed now that we use setupSpeechRecognitionHandlers
  useEffect(() => {
    if (isNativeApp) return // Skip web speech setup for native app
    
    if (!recognitionRef.current) {
      console.log('⚠️ No speech recognition available')
      return
    }

    recognitionRef.current.onresult = async (event) => {
      console.log('🎤 Speech recognition result received, results count:', event.results.length)
      
      // Process all results for better feedback
      let finalTranscript = ''
      let interimTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript.trim()
        const confidence = result[0].confidence || 0
        
        if (result.isFinal) {
          finalTranscript += transcript
          console.log('📝 Final transcript:', transcript, 'Confidence:', confidence)
        } else {
          interimTranscript += transcript
          console.log('🔄 Interim transcript:', transcript)
        }
      }
      
      // Show interim results for user feedback
      if (interimTranscript && interimTranscript.length > 3) {
        console.log(`👂 Hearing: "${interimTranscript}"`)
        if (interimTranscript.length > 10) {
          toast.info(`Hearing: "${interimTranscript.substring(0, 30)}${interimTranscript.length > 30 ? '...' : ''}"`)
        }
      }
      
      // Process final transcript
      if (finalTranscript && finalTranscript.length > 2) {
        console.log(`✅ Processing final transcript: "${finalTranscript}"`)
        setIsListening(false)
        playSound('success-chime', 0.6)
        triggerCelebration('emoji', '👂')
        toast.success(`Heard: "${finalTranscript}"`)
        
        console.log('🤖 Generating AI response...')
        const aiResponse = await generateAIResponse(finalTranscript)
        console.log('💬 AI response ready:', aiResponse.substring(0, 50) + '...')
        await speakResponse(aiResponse)
      } else if (finalTranscript) {
        console.log('⚠️ Final transcript too short:', finalTranscript)
        toast.info('Didn\'t catch that clearly. Try speaking a bit longer or louder.')
        
        // Continue listening if transcript is too short
        setTimeout(() => {
          if (callState === 'active' && !aiSpeaking && !isListening) {
            console.log('🔄 Restarting listening after short transcript')
            startListening()
          }
        }, 1500)
      }
    }

    recognitionRef.current.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error, event)
      setIsListening(false)
      playSound('error-boop')
      triggerCelebration('emoji', '🤔')
      
      // Enhanced error handling with specific messages and retries
      switch (event.error) {
        case 'no-speech':
          console.log('⚠️ No speech detected')
          toast.info('🎤 No speech detected. Make sure you\'re speaking clearly into the microphone.')
          // Don't auto-retry for no-speech to avoid endless loops
          setTimeout(() => {
            if (callState === 'active' && !aiSpeaking && !isListening) {
              console.log('🔄 Restarting after no-speech with user guidance')
              toast.info('🎤 Ready to listen again - speak when you see this message')
              startListening()
            }
          }, 3000)
          break
          
        case 'audio-capture':
          console.error('❌ Audio capture failed - microphone issue')
          toast.error('🎤 Microphone access issue. Please check your microphone connection and refresh.')
          break
          
        case 'not-allowed':
          console.error('❌ Microphone permission denied')
          toast.error('🎤 Microphone permission denied. Please allow access and refresh the page.')
          break
          
        case 'network':
          console.error('❌ Network error during speech recognition')
          toast.error('🌐 Network error. Please check your internet connection.')
          setTimeout(() => {
            if (callState === 'active' && !aiSpeaking && !isListening) {
              console.log('🔄 Retrying after network error')
              startListening()
            }
          }, 4000)
          break
          
        case 'service-not-allowed':
          console.error('❌ Speech recognition service not allowed')
          toast.error('🎤 Speech recognition blocked. Please check browser settings.')
          break
          
        case 'language-not-supported':
          console.error('❌ Language not supported, creating fresh recognition instance...')
          toast.info('🎤 Language issue detected - creating fresh speech recognition...')
          if (recognitionRef.current) {
            // Instead of trying different languages, create a completely fresh instance
            // without any language constraints - let browser handle it
            try {
              const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
              recognitionRef.current = new SpeechRecognition()
              recognitionRef.current.continuous = false
              recognitionRef.current.interimResults = true
              recognitionRef.current.maxAlternatives = 1
              // Use best available English language to prevent language errors
              recognitionRef.current.lang = getBestEnglishLanguage()
              
              setupSpeechRecognitionHandlers()
              console.log(`🔄 Created fresh recognition instance with English (${getBestEnglishLanguage()})`)
              toast.success(`🎤 Reset to English language`)
              
              // Retry if we're in an active call
              if (callState === 'active' && !aiSpeaking && !isListening) {
                setTimeout(() => startListening(), 1000)
              }
            } catch (resetError) {
              console.error('❌ Failed to create fresh recognition:', resetError)
              toast.error('🎤 Speech recognition not supported in this browser')
            }
          }
          break
          
        case 'aborted':
          console.log('ℹ️ Speech recognition aborted (normal during cleanup)')
          break
          
        default:
          console.error('❌ Unknown speech recognition error:', event.error)
          toast.error(`🎤 Voice error: ${event.error}. Retrying in 3 seconds...`)
          setTimeout(() => {
            if (callState === 'active' && !aiSpeaking && !isListening) {
              console.log('🔄 Retrying after unknown error')
              startListening()
            }
          }, 3000)
      }
    }

    recognitionRef.current.onstart = () => {
      console.log('🎤 Speech recognition started successfully')
      setIsListening(true)
      playSound('pop', 0.4)
      triggerCelebration('sparkles')
      toast.success('🎤 Listening! Speak clearly now...')
    }

    recognitionRef.current.onend = () => {
      console.log('🛑 Speech recognition ended, callState:', callState, 'aiSpeaking:', aiSpeaking, 'isListening:', isListening)
      
      // Only auto-restart if we should still be listening
      if (callState === 'active' && !aiSpeaking) {
        console.log('🔄 Auto-restarting speech recognition in 2 seconds...')
        setTimeout(() => {
          if (callState === 'active' && !aiSpeaking && !isListening) {
            console.log('🎤 Restarting speech recognition after normal end')
            startListening()
          }
        }, 2000) // Longer delay to prevent rapid restarts
      } else {
        console.log('ℹ️ Not restarting speech recognition - call ended or AI speaking')
        setIsListening(false)
      }
    }

    recognitionRef.current.onspeechstart = () => {
      console.log('🗣️ Speech started - user began speaking')
      toast.info('🗣️ Speech detected! Keep talking...')
    }

    recognitionRef.current.onspeechend = () => {
      console.log('🤐 Speech ended - user stopped speaking')
      toast.info('🤐 Speech ended, processing...')
    }

    recognitionRef.current.onsoundstart = () => {
      console.log('🔊 Sound started - microphone detecting audio')
    }

    recognitionRef.current.onsoundend = () => {
      console.log('🔇 Sound ended - no more audio detected')
    }

    recognitionRef.current.onaudiostart = () => {
      console.log('🎵 Audio input started')
    }

    recognitionRef.current.onaudioend = () => {
      console.log('🎵 Audio input ended')
    }

    recognitionRef.current.onnomatch = () => {
      console.log('❓ No match found for speech input')
      toast.info('🎤 Didn\'t understand that. Please try speaking again.')
    }

  }, [callState, aiSpeaking, generateAIResponse, speakResponse, isNativeApp, isListening, startListening, playSound, triggerCelebration, getBestEnglishLanguage])

  const startCall = async () => {
    handleButtonPress('call-button', 'call-start')
    setCallState('connecting')
    setCallDuration(0)
    
    // Trigger celebration effects
    triggerCelebration('hearts')
    setTimeout(() => triggerCelebration('sparkles'), 500)
    
    // Generate conversation ID
    const conversationId = Date.now().toString()
    setCurrentConversationId(conversationId)
    
    console.log('📞 Starting call with conversation ID:', conversationId)
    toast.info('📞 Connecting to your AI friend...')
    
    // Check if speech recognition is ready
    if (!recognitionRef.current && !isNativeApp) {
      console.error('❌ Speech recognition not available during call start')
      toast.error('🎤 Speech recognition not ready. Please refresh and try again.')
      setCallState('idle')
      return
    }
    
    // Simulate connection delay with cute sound and microphone verification
    setTimeout(async () => {
      setCallState('active')
      triggerCelebration('emoji', '🎉')
      playSound('success-chime')
      toast.success('✅ Connected to your AI friend!')
      
      console.log('🤖 Call active, preparing greeting...')
      
      // Quick microphone test before starting conversation
      try {
        console.log('🔬 Running quick microphone test...')
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const analyser = audioContext.createAnalyser()
        const microphone = audioContext.createMediaStreamSource(stream)
        microphone.connect(analyser)
        
        analyser.fftSize = 256
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        
        // Quick 1-second test
        let hasAudio = false
        const testStart = Date.now()
        const quickTest = () => {
          analyser.getByteFrequencyData(dataArray)
          const sum = dataArray.reduce((a, b) => a + b, 0)
          const average = sum / dataArray.length
          if (average > 1) hasAudio = true
          
          if (Date.now() - testStart < 1000) {
            requestAnimationFrame(quickTest)
          } else {
            audioContext.close()
            stream.getTracks().forEach(track => track.stop())
            
            if (hasAudio) {
              console.log('✅ Microphone test passed')
              toast.success('🎤 Microphone working!')
            } else {
              console.log('⚠️ No audio detected during test')
              toast.warning('🎤 Microphone connected but no audio detected')
            }
          }
        }
        quickTest()
        
      } catch (error) {
        console.error('❌ Microphone test failed:', error)
        toast.error('🎤 Microphone test failed - please check microphone access')
      }
      
      // AI greeting with personality
      const greeting = `Hello! I'm ${selectedPersonality.name} and I'm so excited to chat with you! ${selectedPersonality.conversationStyle.greeting}`
      
      console.log('🗣️ Speaking greeting:', greeting.substring(0, 50) + '...')
      await speakResponse(greeting)
      
      // Start listening after greeting with longer delay to ensure TTS finishes
      console.log('⏳ Setting up voice recognition after greeting...')
      setTimeout(() => {
        if (callState === 'active' && !aiSpeaking) {
          console.log('🎤 Starting voice recognition after greeting completed...')
          toast.info('🎤 Ready to listen! Start speaking now...')
          startListening()
        } else {
          console.log('⚠️ Not starting listening - callState:', callState, 'aiSpeaking:', aiSpeaking)
        }
      }, 7000) // Increased delay to let greeting finish completely
    }, 1500)
  }

  // Handle sharing drawings with AI using enhanced LLM service
  const handleDrawingShare = useCallback(async (imageData: string) => {
    try {
      // Create a prompt for the AI to respond to the drawing
      const basePrompt = `A child has just drawn a picture and wants to show it to you. You are ${selectedPersonality.name}, ${selectedPersonality.description}. Please respond enthusiastically and encourage their creativity. Ask them about their drawing in a ${selectedPersonality.conversationStyle.responseStyle} way. Keep it short and age-appropriate for a 4-year-old.`
      
      console.log(`🎨 Generating drawing response using ${llmStatus.currentLLM} LLM...`)
      
      const result = await llmService.generateResponse(basePrompt, selectedPersonality.id)
      
      triggerCelebration('confetti')
      await speakResponse(result.response)
      setIsDrawingOpen(false)
      
    } catch (error) {
      console.error('❌ Error generating drawing response:', error)
      const fallbackResponse = "What a wonderful drawing! You're such a talented artist!"
      await speakResponse(fallbackResponse)
      setIsDrawingOpen(false)
    }
  }, [selectedPersonality, llmStatus.currentLLM, speakResponse, triggerCelebration])

  // Get personality-specific drawing responses
  const getDrawingResponsesByPersonality = (personality: AIPersonality) => {
    switch (personality.id) {
      case 'cheerful-buddy':
        return [
          "That's the most wonderful picture I've ever seen! Tell me all about it!",
          "Oh my goodness, that's fantastic! What's your favorite part of your drawing?",
          "What a masterpiece! You should be so proud of your amazing art!"
        ]
      case 'curious-explorer':
        return [
          "What an interesting drawing! Can you tell me about the story behind it?",
          "How fascinating! What materials did you use to create this?",
          "That's a wonderful observation in art form! What inspired you to draw this?"
        ]
      case 'gentle-friend':
        return [
          "That's such a beautiful drawing, dear. It makes me feel so happy to see it.",
          "What a lovely picture. Thank you for sharing your special art with me.",
          "How peaceful and beautiful your drawing is. You have such a gentle artistic touch."
        ]
      case 'silly-joker':
        return [
          "Haha! That's absolutely bonkers and brilliant! What a giggly good drawing!",
          "What a wonderfully wacky and fantastic picture! It makes me want to dance!",
          "That's hilariously awesome! Did you have fun making all those silly details?"
        ]
      case 'wise-owl':
        return [
          "What a thoughtfully composed artwork! You show great artistic wisdom.",
          "That's a very perceptive piece of art. What techniques did you use?",
          "How scholarly and creative! Your drawing shows deep thinking and planning."
        ]
      case 'creative-artist':
        return [
          "What an absolutely magnificent piece of art! Your creativity shines so brightly!",
          "That's gorgeously imaginative! What beautiful artistic choices you made!",
          "How wonderfully expressive and colorful! You have such an artistic soul!"
        ]
      default:
        return [
          "That's wonderful! Tell me all about your amazing artwork!",
          "What a beautiful drawing! I love seeing your creativity!"
        ]
    }
  }

  const endCall = async () => {
    handleButtonPress('end-call-button', 'call-end')
    setCallState('ending')
    
    triggerCelebration('emoji', '👋')
    setTimeout(() => triggerCelebration('hearts'), 300)
    
    // Stop speech recognition and synthesis (unified for web and native)
    if (isNativeApp && voiceChatService.isNativeVoiceAvailable()) {
      await voiceChatService.stopListening()
      await voiceChatService.stopSpeaking()
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
    
    setIsListening(false)
    setAiSpeaking(false)
    
    // Save conversation to history
    if (currentConversationId && callDuration > 0) {
      const newConversation: ConversationEntry = {
        id: currentConversationId,
        timestamp: Date.now(),
        duration: callDuration,
        topics: selectedPersonality.conversationStyle.topics.slice(0, 3), // Use personality topics
        personalityId: selectedPersonality.id
      }
      
      setConversations(prev => [newConversation, ...prev.slice(0, 9)]) // Keep last 10
      playSound('success-chime', 0.5)
    }
    
    setTimeout(() => {
      setCallState('idle')
      setCurrentConversationId(null)
      setCallDuration(0)
      toast.success('Call ended. Thanks for chatting!')
    }, 1000)
  }

  const renderPhoneView = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-8">
      {/* LLM Status Card - only show in cloud mode */}
      {llmMode === 'cloud' && (
        <div className="fixed top-4 left-4 z-50">
          <Card className="cute-card p-3 max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: llmStatus.currentLLM === 'cloud' ? '#3b82f6' : 
                                   llmStatus.currentLLM === 'local' ? '#10b981' : '#94a3b8'
                  }}
                />
                <span className="font-medium">
                  {llmStatus.currentLLM === 'cloud' ? '☁️ Cloud AI' : 
                   llmStatus.currentLLM === 'local' ? '📱 Local AI' : '💾 Offline'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {llmStatus.modelInfo}
              </div>
              <div className="flex gap-1 text-xs">
                <span className={`px-1 py-0.5 rounded text-xs ${
                  llmStatus.cloudAvailable ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  ☁️ {llmStatus.cloudAvailable ? 'On' : 'Off'}
                </span>
                <span className={`px-1 py-0.5 rounded text-xs ${
                  llmStatus.localAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  📱 {llmStatus.localAvailable ? 'On' : 'Off'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Network Status Warning */}
      {!isOnline && (
        <div className="fixed top-4 right-4 z-50">
          <Card className="cute-card p-3 border-orange-300 bg-orange-50">
            <div className="flex items-center gap-2 text-sm text-orange-700">
              <WifiX size={16} />
              <span>Offline - {llmStatus.localAvailable ? 'Using local AI' : 'Limited functionality'}</span>
            </div>
          </Card>
        </div>
      )}

      {/* Enhanced Debug Panel with Voice Status */}
      {callState === 'active' && (
        <div className="fixed top-4 right-4 z-40 max-w-sm">
          <Card className="cute-card p-3 text-xs">
            <div className="space-y-2">
              <div className="font-medium text-center">🔍 Voice System Status</div>
              
              {/* Core Status */}
              <div className="grid grid-cols-2 gap-2">
                <div>Call State: <span className="font-bold text-blue-600">{callState}</span></div>
                <div>Listening: <span className={`font-bold ${isListening ? 'text-green-600' : 'text-red-600'}`}>{isListening ? '✅ YES' : '❌ NO'}</span></div>
                <div>AI Speaking: <span className={`font-bold ${aiSpeaking ? 'text-orange-600' : 'text-gray-600'}`}>{aiSpeaking ? '✅ YES' : '❌ NO'}</span></div>
                <div>Native App: <span className={`font-bold ${isNativeApp ? 'text-green-600' : 'text-gray-600'}`}>{isNativeApp ? '✅ YES' : '❌ NO'}</span></div>
              </div>
              
              {/* Recognition Status */}
              <div className="border-t pt-2">
                <div className="font-medium mb-1">🎤 Recognition:</div>
                <div>Available: <span className={`font-bold ${recognitionRef.current ? 'text-green-600' : 'text-red-600'}`}>{recognitionRef.current ? '✅ YES' : '❌ NO'}</span></div>
                {recognitionRef.current && (
                  <div className="text-xs space-y-1 mt-1">
                    <div>Lang: {recognitionRef.current.lang}</div>
                    <div>Continuous: {recognitionRef.current.continuous ? 'Yes' : 'No'}</div>
                    <div>Interim: {recognitionRef.current.interimResults ? 'Yes' : 'No'}</div>
                  </div>
                )}
              </div>
              
              {/* Synthesis Status */}
              <div className="border-t pt-2">
                <div className="font-medium mb-1">🔊 Synthesis:</div>
                <div>Available: <span className={`font-bold ${synthRef.current ? 'text-green-600' : 'text-red-600'}`}>{synthRef.current ? '✅ YES' : '❌ NO'}</span></div>
                {synthRef.current && (
                  <div className="text-xs mt-1">
                    <div>Speaking: {synthRef.current.speaking ? 'Yes' : 'No'}</div>
                    <div>Pending: {synthRef.current.pending ? 'Yes' : 'No'}</div>
                    <div>Paused: {synthRef.current.paused ? 'Yes' : 'No'}</div>
                  </div>
                )}
              </div>
              
              {/* Browser Info */}
              <div className="border-t pt-2">
                <div className="font-medium mb-1">🌐 Browser:</div>
                <div className="text-xs">
                  {navigator.userAgent.includes('Chrome') ? '✅ Chrome' : 
                   navigator.userAgent.includes('Safari') ? '✅ Safari' : 
                   navigator.userAgent.includes('Firefox') ? '⚠️ Firefox' : 
                   '❌ Other'}
                </div>
                <div className="text-xs">
                  {/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '📱 Mobile' : '💻 Desktop'}
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="border-t pt-2 flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (recognitionRef.current && isListening) {
                      recognitionRef.current.stop()
                      setIsListening(false)
                      toast.info('🛑 Stopped listening')
                    } else if (recognitionRef.current && !isListening && !aiSpeaking) {
                      startListening()
                    }
                  }}
                  className="text-xs h-6 px-2"
                >
                  {isListening ? 'Stop' : 'Start'} Mic
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (synthRef.current) {
                      synthRef.current.cancel()
                      setAiSpeaking(false)
                      toast.info('🔇 Stopped speaking')
                    }
                  }}
                  className="text-xs h-6 px-2"
                >
                  Stop TTS
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground cute-bounce">AI Friend</h1>
        <p className="text-lg text-muted-foreground">
          Your {selectedPersonality.name} is ready to chat!
        </p>
        
        <div 
          className="p-3 rounded-lg border-2 cute-card flex items-center justify-center text-lg cute-pulse"
          style={{ backgroundColor: `${selectedPersonality.color}20` }}
        >
          {selectedPersonality.emoji}
        </div>
        <Badge 
          variant="secondary"
          className="cute-card border-0"
          style={{ backgroundColor: `${selectedPersonality.color}15` }}
        >
          {selectedPersonality.conversationStyle.responseStyle}
        </Badge>
      </div>

      {/* Adorable AI Avatar with cute styling and particle effects */}
      <div className="relative">
        {/* Active Particle Effects */}
        <ParticleEffects 
          isActive={callState === 'active' || aiSpeaking || callState === 'connecting'}
          color={selectedPersonality.color}
          intensity={
            aiSpeaking ? 'high' : 
            callState === 'active' ? 'medium' : 
            callState === 'connecting' ? 'low' : 
            'low'
          }
          type={
            selectedPersonality.id === 'cheerful-buddy' ? 'mixed' :
            callState === 'connecting' ? 'mixed' :
            aiSpeaking ? 'sparkles' :
            selectedPersonality.id === 'gentle-friend' ? 'hearts' :
            selectedPersonality.id === 'silly-joker' ? 'mixed' :
            selectedPersonality.id === 'wise-owl' ? 'stars' :
            selectedPersonality.id === 'creative-artist' ? 'mixed' :
            'sparkles'
          }
        />
        
        {/* Hover Particle Effects for Idle State */}
        {callState === 'idle' && (
          <ParticleEffects 
            isActive={false}
            color={selectedPersonality.color}
            intensity="low"
            type="sparkles"
          />
        )}
        
        <div className="relative">
          <PulsingGlow 
            active={aiSpeaking || callState === 'connecting'} 
            intensity={aiSpeaking ? 'high' : 'medium'} 
            color={selectedPersonality.color}
          >
            <Avatar 
              className="w-40 h-40 border-8 transition-all duration-300 hover:scale-105 cursor-pointer"
              style={{
                borderColor: selectedPersonality.color,
                background: `linear-gradient(135deg, ${selectedPersonality.color}20 0%, ${selectedPersonality.color}10 100%)`
              }}
              onClick={() => {
                handleButtonPress('avatar-tap', 'pop')
                triggerCelebration('sparkles')
              }}
            >
              <AvatarFallback 
                className="text-6xl bg-transparent"
                style={{ 
                  backgroundColor: `${selectedPersonality.color}15`,
                  background: `radial-gradient(circle, ${selectedPersonality.color}25 0%, ${selectedPersonality.color}10 100%)`
                }}
              >
                <WigglyIcon active={isListening}>
                  {selectedPersonality.emoji}
                </WigglyIcon>
              </AvatarFallback>
            </Avatar>
          </PulsingGlow>

          {/* Enhanced decorative elements around avatar */}
          <div className="absolute -top-3 -right-3 w-4 h-4 bg-yellow-300 rounded-full cute-float opacity-60 z-20 flex items-center justify-center">
            <span className="text-xs">✨</span>
          </div>
          <div className="absolute -bottom-3 -right-3 w-4 h-4 bg-purple-300 rounded-full cute-float opacity-60 z-20 flex items-center justify-center">
            <span className="text-xs">💫</span>
          </div>
          <div className="absolute -top-3 -left-3 w-4 h-4 bg-blue-300 rounded-full cute-float opacity-60 z-20 flex items-center justify-center">
            <span className="text-xs">⭐</span>
          </div>

          {/* Magical glow effect when active */}
          {(callState === 'active' || aiSpeaking) && (
            <div 
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                background: `radial-gradient(circle, ${selectedPersonality.color}30 0%, transparent 70%)`,
                filter: 'blur(8px)',
                transform: 'scale(1.3)',
                zIndex: 0
              }}
            />
          )}
        </div>

        {aiSpeaking && (
          <div className="absolute -bottom-4 -right-4 z-30">
            <Badge variant="outline" className="cute-card animate-pulse border-accent text-accent">
              <Volume2 size={16} className="mr-1" />
              Speaking
            </Badge>
          </div>
        )}
        
        {isListening && (
          <div className="absolute -bottom-4 -left-4 z-30">
            <div className="flex flex-col items-center gap-2">
              <Badge variant="outline" className="cute-card animate-pulse border-accent text-accent">
                🎤 Listening
              </Badge>
              {/* Mini audio visualization */}
              <AudioVisualization
                isListening={isListening}
                color={selectedPersonality.color}
                size="small"
                type="bars"
              />
            </div>
          </div>
        )}
      </div>

      {callState === 'active' && (
        <div className="text-center space-y-2">
          <p className="text-xl font-semibold text-primary cute-pulse">
            Call Duration: {formatDuration(callDuration)}
          </p>
          
          {/* Audio Visualization Component */}
          <div className="flex flex-col items-center gap-4">
            {/* Vivid audio visualization - different types for speaking vs listening */}
            <AudioVisualization
              isListening={isListening || aiSpeaking}
              color={selectedPersonality.color}
              size="large"
              type={aiSpeaking ? "circle" : "wave"}
            />
            
            {/* Enhanced status indicators */}
            {isListening && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 border-2 border-blue-300 rounded-full animate-pulse">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
                <span className="text-blue-700 font-medium">🎤 Listening for your voice...</span>
              </div>
            )}
            
            {aiSpeaking && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 border-2 border-green-300 rounded-full animate-pulse">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                <span className="text-green-700 font-medium">🤖 {selectedPersonality.name} is speaking...</span>
              </div>
            )}
            
            {!isListening && !aiSpeaking && (
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 border-2 border-orange-300 rounded-full">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-orange-700 font-medium">⏳ Ready to listen...</span>
                <Button
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    console.log('🚀 Quick start listening from status indicator')
                    startListening()
                  }}
                  className="ml-2 h-6 px-2 text-xs border-orange-400 text-orange-600 hover:bg-orange-50"
                >
                  Start Now
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {callState === 'idle' && (
          <div className="flex flex-col items-center gap-3">
            <PulsingGlow active={true} color="primary">
              <Button
                id="call-button"
                onClick={startCall}
                size="lg"
                className="button-text h-20 w-56 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 cute-pulse"
                style={{ 
                  background: `linear-gradient(135deg, ${selectedPersonality.color} 0%, ${selectedPersonality.color}cc 100%)`,
                  border: '3px solid white'
                }}
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Phone size={24} />
                  </div>
                  <span>Call {selectedPersonality.name}</span>
                </div>
              </Button>
            </PulsingGlow>
            
            {/* LLM Mode Toggle Button - positioned below call button */}
            <Button
              id="llm-toggle"
              onClick={handleLlmModeChange}
              variant="outline"
              size="lg"
              className="cute-card border-2 hover:shadow-lg transition-all button-text h-12 w-56 rounded-full"
              style={{
                borderColor: llmStatus.currentLLM === 'cloud' ? '#3b82f6' : 
                            llmStatus.currentLLM === 'local' ? '#10b981' : '#94a3b8',
                backgroundColor: llmStatus.currentLLM === 'cloud' ? '#eff6ff' : 
                               llmStatus.currentLLM === 'local' ? '#ecfdf5' : '#f1f5f9'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                  backgroundColor: llmStatus.currentLLM === 'cloud' ? '#3b82f640' : 
                                 llmStatus.currentLLM === 'local' ? '#10b98140' : '#94a3b840'
                }}>
                  {llmMode === 'cloud' && <CloudArrowUp size={20} className="text-blue-600" />}
                  {llmMode === 'local' && <DeviceMobile size={20} className="text-green-600" />}
                  {llmMode === 'auto' && <Robot size={20} className="text-purple-600" />}
                </div>
                <span className="font-medium">
                  {llmMode === 'cloud' ? 'Cloud AI' : llmMode === 'local' ? 'Local AI' : 'Auto AI'}
                </span>
              </div>
            </Button>
          </div>
        )}

        {callState === 'connecting' && (
          <Button 
            disabled 
            size="lg"
            className="button-text h-20 w-56 rounded-full shadow-lg cute-breathe"
            style={{ 
              background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
              border: '3px solid white'
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-3"></div>
              Connecting...
            </div>
          </Button>
        )}

        {callState === 'active' && (
          <div className="flex flex-col items-center gap-4">
            <PulsingGlow active={true} color="warning">
              <Button
                id="end-call-button"
                onClick={endCall}
                size="lg"
                className="button-text h-20 w-56 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 cute-wiggle"
                style={{ 
                  background: 'linear-gradient(135deg, #ff6b9d 0%, #ff8e9b 100%)',
                  border: '3px solid white'
                }}
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <PhoneOff size={24} />
                  </div>
                  <span>Hang Up</span>
                </div>
              </Button>
            </PulsingGlow>

            {/* Push to Talk Button - only show during active call */}
            {callState === 'active' && (
              <div className="flex flex-col gap-2">
                <PulsingGlow active={isListening} color="accent">
                  <Button
                    id="push-to-talk-button"
                    onClick={() => {
                      handleButtonPress('push-to-talk-button', 'pop')
                      if (!isListening && !aiSpeaking) {
                        console.log('🎤 Manual listening trigger via push-to-talk')
                        startListening()
                      } else if (isListening) {
                        console.log('🛑 Stopping listening via push-to-talk')
                        if (recognitionRef.current) {
                          recognitionRef.current.stop()
                        }
                        setIsListening(false)
                      }
                    }}
                    size="lg"
                    disabled={aiSpeaking}
                    className={`button-text h-16 w-48 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ${
                      isListening ? 'cute-pulse' : 'cute-bounce'
                    }`}
                    style={{ 
                      background: isListening 
                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                      opacity: aiSpeaking ? 0.5 : 1
                    }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isListening ? (
                        <>
                          <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                          <span>🎤 Listening...</span>
                        </>
                      ) : (
                        <>
                          <span>🎤</span>
                          <span>Push to Talk</span>
                        </>
                      )}
                    </div>
                  </Button>
                </PulsingGlow>
                
                {/* Force Start Listening Button for debugging */}
                <Button
                  id="force-listen-button"
                  onClick={() => {
                    handleButtonPress('force-listen-button', 'magic-sparkle')
                    console.log('🔧 Force starting speech recognition...')
                    toast.info('🔧 Force starting speech recognition')
                    
                    // Stop any existing recognition first
                    if (recognitionRef.current && isListening) {
                      recognitionRef.current.stop()
                      setIsListening(false)
                    }
                    
                    // Force restart after a short delay
                    setTimeout(() => {
                      if (recognitionRef.current) {
                        setIsListening(true)
                        try {
                          recognitionRef.current.start()
                          console.log('✅ Force started speech recognition')
                          toast.success('🎤 Speech recognition force started!')
                        } catch (error) {
                          console.error('❌ Force start failed:', error)
                          setIsListening(false)
                          toast.error('❌ Force start failed: ' + error.message)
                        }
                      }
                    }, 500)
                  }}
                  variant="outline"
                  size="sm"
                  disabled={aiSpeaking}
                  className="button-text h-12 w-48 border-2 border-yellow-400 hover:border-yellow-500 text-yellow-700 hover:text-yellow-800 bg-yellow-50 hover:bg-yellow-100"
                >
                  🔧 Force Start Listening
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <Button
          id="personality-button"
          onClick={() => {
            handleButtonPress('personality-button', 'whoosh')
            setCurrentView('personality')
          }}
          variant="outline"
          size="lg"
          className="button-text h-16 cute-card border-2 border-primary/30 hover:border-primary/50 transition-all"
        >
          <WigglyIcon active={lastButtonPressed === 'personality-button'}>
            <User size={20} className="mr-2" />
          </WigglyIcon>
          AI Friends
        </Button>

        {/* Test Voice Button */}
        <Button
          id="test-voice-button"
          onClick={() => {
            handleButtonPress('test-voice-button', 'magic-sparkle')
            triggerCelebration('sparkles')
            const testMessage = `Hello! This is ${selectedPersonality.name} testing the voice. Can you hear me clearly?`
            speakResponse(testMessage)
          }}
          variant="outline"
          size="lg"
          className="button-text h-16 cute-card border-2 border-green-300 hover:border-green-400 transition-all text-green-600 hover:text-green-700"
        >
          <WigglyIcon active={lastButtonPressed === 'test-voice-button'}>
            <Volume2 size={20} className="mr-2 cute-bounce" />
          </WigglyIcon>
          Test Voice
        </Button>

        {/* Test Microphone Button */}
        <Button
          id="test-mic-button"
          onClick={async () => {
            handleButtonPress('test-mic-button', 'pop')
            triggerCelebration('sparkles')
            
            try {
              console.log('🎤 Testing microphone...')
              toast.info('🎤 Testing microphone... Please speak!')
              
              // Create a temporary speech recognition for testing
              if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
                const testRecognition = new SpeechRecognition()
                
                testRecognition.continuous = false
                testRecognition.interimResults = false
                testRecognition.maxAlternatives = 1
                
                // Try to set a compatible language
                // Don't set language - let browser handle auto-detection
                // This prevents "language-not-supported" errors
                console.log('🎤 Microphone test using browser auto-detection')
                console.log(`🌐 Navigator language: ${navigator.language}`)
                console.log(`🌍 Available languages: ${navigator.languages.join(', ')}`)
                
                testRecognition.onresult = (event) => {
                  const transcript = event.results[0][0].transcript
                  const confidence = event.results[0][0].confidence || 0
                  console.log('✅ Microphone test successful:', transcript)
                  toast.success(`🎤 Microphone working! Heard: "${transcript}" (${Math.round(confidence * 100)}% confident)`)
                  triggerCelebration('confetti')
                }
                
                testRecognition.onerror = (event) => {
                  console.error('❌ Microphone test failed:', event.error)
                  if (event.error === 'language-not-supported') {
                    toast.warning('⚠️ Language not supported, but microphone hardware seems fine. The Quick Test button may work better.')
                  } else {
                    toast.error(`🎤 Microphone test failed: ${event.error}`)
                  }
                }
                
                testRecognition.onstart = () => {
                  toast.info('🎤 Speak now for 3 seconds...')
                }
                
                testRecognition.onend = () => {
                  console.log('🛑 Microphone test ended')
                }
                
                try {
                  testRecognition.start()
                  
                  // Auto-stop after 3 seconds
                  setTimeout(() => {
                    try {
                      testRecognition.stop()
                    } catch (e) {
                      console.log('Test recognition already stopped')
                    }
                  }, 3000)
                } catch (startError) {
                  console.error('❌ Failed to start microphone test:', startError)
                  toast.error('❌ Failed to start microphone test: ' + startError.message)
                }
                
              } else {
                toast.error('🎤 Speech recognition not available in this browser')
              }
            } catch (error) {
              console.error('❌ Microphone test error:', error)
              toast.error('🎤 Microphone test failed: ' + error.message)
            }
          }}
          variant="outline"
          size="lg"
          className="button-text h-16 cute-card border-2 border-blue-300 hover:border-blue-400 transition-all text-blue-600 hover:text-blue-700"
        >
          <WigglyIcon active={lastButtonPressed === 'test-mic-button'}>
            🎤
          </WigglyIcon>
          Test Mic
        </Button>

        {/* Voice Debugger Button */}
        <Button
          id="voice-debug-button"
          onClick={() => {
            handleButtonPress('voice-debug-button', 'pop')
            setIsDebuggerOpen(true)
          }}
          variant="outline"
          size="lg"
          className="button-text h-16 cute-card border-2 border-red-300 hover:border-red-400 transition-all text-red-600 hover:text-red-700"
        >
          <WigglyIcon active={lastButtonPressed === 'voice-debug-button'}>
            <Bug size={20} className="mr-2" />
          </WigglyIcon>
          Voice Debug
        </Button>

        <Button
          id="drawing-button"
          onClick={() => {
            handleButtonPress('drawing-button', 'drawing-brush')
            triggerCelebration('stars')
            setIsDrawingOpen(true)
          }}
          variant="outline"
          size="lg"
          className="button-text h-16 cute-card border-2 border-purple-300 hover:border-purple-400 transition-all text-purple-600 hover:text-purple-700"
        >
          <WigglyIcon active={lastButtonPressed === 'drawing-button'}>
            <Palette size={20} className="mr-2 magic-sparkle" />
          </WigglyIcon>
          Draw for AI
        </Button>

        {/* Test Visualizations Button */}
        <Button
          id="test-viz-button"
          onClick={() => {
            handleButtonPress('test-viz-button', 'magic-sparkle')
            triggerCelebration('sparkles')
            toast.success('Audio visualization shows sound levels!')
          }}
          variant="outline"
          size="lg"
          className="button-text h-16 cute-card border-2 border-cyan-300 hover:border-cyan-400 transition-all text-cyan-600 hover:text-cyan-700"
        >
          <WigglyIcon active={lastButtonPressed === 'test-viz-button'}>
            📊
          </WigglyIcon>
          Audio Viz
        </Button>

        <Button
          id="history-button"
          onClick={() => {
            handleButtonPress('history-button', 'button-tap')
            setCurrentView('history')
          }}
          variant="outline"
          size="lg"
          className="button-text h-16 cute-card border-2 border-accent/30 hover:border-accent/50 transition-all"
        >
          <WigglyIcon active={lastButtonPressed === 'history-button'}>
            <History size={20} className="mr-2" />
          </WigglyIcon>
          History
        </Button>

        <Button
          onClick={() => setCurrentView('settings')}
          variant="outline"
          size="lg"
          className="button-text h-16 cute-card border-2 border-muted-foreground/30 hover:border-muted-foreground/50 transition-all"
        >
          <Settings size={20} className="mr-2" />
          Settings
        </Button>

        {/* Language Compatibility Check Button */}
        <Button
          id="language-check-button"
          onClick={async () => {
            handleButtonPress('language-check-button', 'magic-sparkle')
            
            try {
              console.log('🔍 Running comprehensive language compatibility check...')
              toast.info('🔍 Checking language compatibility...')
              
              const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
              // Test with browser's available languages first, then fallback to common English variants
              const navigatorLanguages = navigator.languages.filter(lang => lang.startsWith('en'))
              const commonEnglishLanguages = ['en', 'en-GB', 'en-US', 'en-AU', 'en-CA']
              const testLanguages = [...navigatorLanguages, ...commonEnglishLanguages.filter(lang => !navigatorLanguages.includes(lang))]
              
              const supportedLanguages = []
              const unsupportedLanguages = []
              
              for (const lang of testLanguages) {
                try {
                  const testRec = new SpeechRecognition()
                  testRec.lang = lang
                  
                  // Test if we can access the lang property after setting
                  if (testRec.lang === lang) {
                    supportedLanguages.push(lang)
                    console.log(`✅ ${lang} - Supported`)
                  } else {
                    unsupportedLanguages.push(lang)
                    console.log(`❌ ${lang} - Setting failed`)
                  }
                } catch (error) {
                  unsupportedLanguages.push(lang)
                  console.log(`❌ ${lang} - Error: ${error.message}`)
                }
              }
              
              // Show results
              if (supportedLanguages.length > 0) {
                toast.success(`✅ Supported languages: ${supportedLanguages.join(', ')}`)
                console.log('✅ Supported languages:', supportedLanguages)
              }
              
              if (unsupportedLanguages.length > 0) {
                toast.warning(`⚠️ Unsupported: ${unsupportedLanguages.join(', ')}`)
                console.log('❌ Unsupported languages:', unsupportedLanguages)
              }
              
              // Now test default browser language
              try {
                const defaultTest = new SpeechRecognition()
                console.log(`🌐 Browser default language: ${defaultTest.lang}`)
                toast.info(`🌐 Browser default: ${defaultTest.lang}`)
              } catch (error) {
                console.log('❌ Could not access default browser language')
              }
              
              // Test actual recognition start with best supported language
              if (supportedLanguages.length > 0) {
                const bestLang = supportedLanguages[0]
                toast.info(`🎤 Testing speech recognition with ${bestLang}...`)
                
                const finalTest = new SpeechRecognition()
                finalTest.lang = bestLang
                finalTest.continuous = false
                finalTest.interimResults = false
                
                finalTest.onstart = () => {
                  toast.success(`✅ ${bestLang} recognition started! Say "test"...`)
                }
                
                finalTest.onresult = (event) => {
                  const transcript = event.results[0][0].transcript
                  toast.success(`✅ Perfect! Heard: "${transcript}" with ${bestLang}`)
                  triggerCelebration('confetti')
                }
                
                finalTest.onerror = (event) => {
                  toast.error(`❌ Even ${bestLang} failed: ${event.error}`)
                }
                
                finalTest.start()
                setTimeout(() => finalTest.stop(), 3000)
              } else {
                toast.error('❌ No compatible languages found!')
              }
              
            } catch (error) {
              console.error('❌ Language compatibility check failed:', error)
              toast.error('❌ Language check failed: ' + error.message)
            }
          }}
          variant="outline"
          size="lg"
          className="button-text h-16 cute-card border-2 border-purple-300 hover:border-purple-400 transition-all text-purple-600 hover:text-purple-700"
        >
          <WigglyIcon active={lastButtonPressed === 'language-check-button'}>
            🌐
          </WigglyIcon>
          Check Languages
        </Button>

        {/* Quick Voice Test Button */}
        <Button
          id="quick-voice-test"
          onClick={async () => {
            handleButtonPress('quick-voice-test', 'pop')
            
            try {
              // Quick microphone test
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
              toast.success('🎤 Microphone access granted!')
              
              // Quick speech recognition test
              if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                toast.success('🗣️ Speech recognition available!')
                
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
                const recognition = new SpeechRecognition()
                
                // Use best available English language for quick test
                const bestLang = getBestEnglishLanguage()
                recognition.lang = bestLang
                console.log(`🗣️ Quick test using English (${bestLang})`)
                console.log(`🌐 Navigator language: ${navigator.language}`)
                console.log(`🌍 Available languages: ${navigator.languages.join(', ')}`)
                toast.info(`🎤 Testing with ${bestLang} - Say "hello"...`)
                
                recognition.continuous = false
                recognition.interimResults = false
                recognition.maxAlternatives = 1
                
                recognition.onstart = () => {
                  console.log('✅ Quick test recognition started')
                  toast.info('🎤 Listening now - speak clearly!')
                }
                
                recognition.onresult = (event) => {
                  const transcript = event.results[0][0].transcript
                  const confidence = event.results[0][0].confidence || 0
                  console.log('✅ Quick test result:', transcript, 'confidence:', confidence)
                  toast.success(`✅ Heard: "${transcript}" (${Math.round(confidence * 100)}% sure)`)
                  triggerCelebration('confetti')
                }
                
                recognition.onerror = (event) => {
                  console.error('❌ Quick test error:', event.error)
                  if (event.error === 'language-not-supported') {
                    toast.error(`❌ Language not supported. This shouldn't happen with English...`)
                    // Try again with forced English
                    try {
                      const fallbackRecognition = new SpeechRecognition()
                      fallbackRecognition.continuous = false
                      fallbackRecognition.interimResults = false
                      fallbackRecognition.lang = getBestEnglishLanguage()
                      fallbackRecognition.onresult = (event) => {
                        const transcript = event.results[0][0].transcript
                        toast.success(`✅ Fallback test heard: "${transcript}"`)
                      }
                      fallbackRecognition.onerror = (event) => {
                        toast.error(`❌ Even English fallback failed: ${event.error}`)
                      }
                      fallbackRecognition.start()
                      setTimeout(() => fallbackRecognition.stop(), 3000)
                    } catch (fallbackError) {
                      toast.error('❌ Speech recognition completely unavailable')
                    }
                  } else {
                    toast.error(`❌ Error: ${event.error}`)
                  }
                }
                
                recognition.onend = () => {
                  console.log('🛑 Quick test recognition ended')
                }
                
                try {
                  recognition.start()
                  // Auto-stop after 5 seconds for quick test
                  setTimeout(() => {
                    try {
                      recognition.stop()
                    } catch (e) {
                      console.log('Recognition already stopped')
                    }
                  }, 5000)
                } catch (startError) {
                  console.error('❌ Failed to start quick test:', startError)
                  toast.error('❌ Failed to start recognition test')
                }
              } else {
                toast.error('❌ Speech recognition not supported in this browser')
              }
              
              stream.getTracks().forEach(track => track.stop())
              
            } catch (error) {
              toast.error('❌ Microphone access denied or not available')
              console.error('Quick voice test error:', error)
            }
          }}
          variant="outline"
          size="lg"
          className="button-text h-16 cute-card border-2 border-orange-300 hover:border-orange-400 transition-all text-orange-600 hover:text-orange-700"
        >
          <WigglyIcon active={lastButtonPressed === 'quick-voice-test'}>
            ⚡
          </WigglyIcon>
          Quick Test
        </Button>
      </div>
    </div>
  )

  const renderHistoryView = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold cute-bounce">Conversation History</h2>
        <Button 
          onClick={() => setCurrentView('phone')} 
          variant="outline"
          className="cute-card border-2 border-primary/30"
        >
          Back
        </Button>
      </div>

      {conversations.length === 0 ? (
        <Card className="cute-card p-8 text-center">
          <p className="text-muted-foreground">No conversations yet. Start your first call!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {conversations.map((conv) => {
            const personality = AI_PERSONALITIES.find(p => p.id === conv.personalityId) || selectedPersonality
            return (
              <Card key={conv.id} className="cute-card p-4 hover:shadow-lg transition-all">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm cute-pulse"
                    style={{ backgroundColor: `${personality.color}20` }}
                  >
                    {personality.emoji}
                  </div>
                  <div className="flex-1">
                    <div>
                      <p className="font-semibold">
                        Chat with {personality.name}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(conv.timestamp).toLocaleDateString()} at{' '}
                      {new Date(conv.timestamp).toLocaleTimeString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Duration: {formatDuration(conv.duration)}
                    </p>
                    <div className="flex gap-1 mt-2">
                      {conv.topics.map((topic, index) => (
                        <Badge key={index} variant="secondary" className="cute-card border-0">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Heart className="text-pink-400 cute-pulse" />
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderSettingsView = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold cute-bounce">Settings</h2>
        <Button 
          onClick={() => setCurrentView('phone')} 
          variant="outline"
          className="cute-card border-2 border-primary/30"
        >
          Back
        </Button>
      </div>

      <Card className="cute-card p-6">
        <h3 className="text-lg font-semibold">Safety & Parental Controls</h3>
        <p className="text-muted-foreground">
          All conversations are processed locally when possible, and responses are 
          filtered for age-appropriate content.
        </p>
        
        <div className="space-y-2">
          <p className="font-medium">AI Personalities:</p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            {AI_PERSONALITIES.map((personality) => (
              <li key={personality.id}>
                • {personality.emoji} {personality.name} - {personality.description}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="space-y-2">
          <p className="font-medium">Current Friend:</p>
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg cute-pulse"
              style={{ backgroundColor: `${selectedPersonality.color}20` }}
            >
              {selectedPersonality.emoji}
            </div>
            <div>
              <p className="font-semibold">{selectedPersonality.name}</p>
              <p className="text-sm text-muted-foreground">{selectedPersonality.description}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-medium">AI Features:</p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• Multiple AI personalities with unique conversation styles</li>
            <li>• Dual AI mode: Cloud (OpenAI) + Local (Ollama) support</li>
            <li>• Smart fallback: Auto-switches if primary AI fails</li>
            <li>• British English voice responses</li>
            <li>• Real-time audio visualization showing voice input levels</li>
            <li>• Vivid visual feedback when microphone detects sound</li>
            <li>• Child-friendly conversation topics</li>
            <li>• Easy interrupt and hang-up controls</li>
            <li>• Local conversation history</li>
            <li>• No personal data collection</li>
            <li>• Privacy-first: Local AI keeps all data on device</li>
          </ul>
        </div>
        
        <div className="space-y-2">
          <p className="font-medium">AI Modes Explained:</p>
          <div className="space-y-3 ml-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <CloudArrowUp size={16} className="text-blue-600" />
                <span className="font-medium text-blue-900">Cloud Mode</span>
              </div>
              <p className="text-sm text-blue-700">
                Uses OpenAI's GPT models via internet. More conversational but requires internet connection.
                Falls back to local AI if cloud is unavailable.
              </p>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <DeviceMobile size={16} className="text-green-600" />
                <span className="font-medium text-green-900">Local Mode</span>
              </div>
              <p className="text-sm text-green-700">
                Uses Ollama AI running on your device. Complete privacy, works offline.
                Falls back to cloud AI if local model isn't available.
              </p>
            </div>
            
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <Robot size={16} className="text-purple-600" />
                <span className="font-medium text-purple-900">Auto Mode</span>
              </div>
              <p className="text-sm text-purple-700">
                Intelligently chooses the best available AI. Prefers local for privacy, 
                uses cloud for advanced features. Always has offline backup responses.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-4 cute-card border-2 border-primary/20">
          <p className="text-sm font-medium mb-2">Current AI Status:</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Mode:</span>
              <Badge variant="outline" className={`text-xs ${
                llmStatus.currentLLM === 'cloud' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                llmStatus.currentLLM === 'local' ? 'border-green-300 text-green-700 bg-green-50' :
                'border-gray-300 text-gray-700 bg-gray-50'
              }`}>
                {llmMode.charAt(0).toUpperCase() + llmMode.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Current AI:</span>
              <span className="text-sm font-medium">
                {llmStatus.currentLLM === 'cloud' ? '☁️ Cloud' : 
                 llmStatus.currentLLM === 'local' ? '📱 Local' : '💾 Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Model:</span>
              <span className="text-xs text-muted-foreground">{llmStatus.modelInfo}</span>
            </div>
          </div>
        </div>
        
        {llmStatus.currentLLM === 'local' && (
          <div className="mt-4 p-4 cute-card border-2 border-green-300/50">
            <p className="text-sm font-medium mb-2">For your Samsung S24 Ultra:</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <code className="text-xs bg-muted p-2 rounded block">
                # In Termux, install Ollama and download model:
              </code>
              <code className="text-xs bg-muted p-2 rounded block">
                ollama pull gemma2:2b
              </code>
              <code className="text-xs bg-muted p-2 rounded block">
                # Start Ollama server:
              </code>
              <code className="text-xs bg-muted p-2 rounded block">
                ollama serve
              </code>
            </div>
            <div className="mt-3 p-3 bg-muted/50 rounded-md">
              <p className="text-xs font-medium mb-1">Local AI Status:</p>
              <p className="text-xs text-muted-foreground">
                Connection: {llmStatus.localAvailable ? '✅ Connected' : '❌ Not detected'}
              </p>
              {llmStatus.localAvailable && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Model: {ollamaService.getModelDisplayName()} ({ollamaService.getCurrentModel()})
                  </p>
                  <p className="text-xs text-green-600 font-medium mt-1">
                    🚀 Running locally on your Samsung S24 Ultra - No internet required!
                  </p>
                </>
              )}
              {!llmStatus.localAvailable && (
                <p className="text-xs text-orange-600 mt-1">
                  💡 Start Ollama in Termux to enable offline AI conversations
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card className="cute-card p-6">
        <h3 className="text-lg font-semibold mb-4">About Your AI Friends</h3>
        <p className="text-muted-foreground mb-4">
          Each AI friend has their own unique personality and conversation style. 
          Choose different friends for different moods - whether you want to be silly, 
          learn something new, or have a gentle chat.
        </p>
        <p className="text-sm text-muted-foreground">
          <strong>Privacy:</strong> When using the local AI model, all conversations 
          stay completely on your device. No data is sent to external servers. Each 
          personality maintains the same privacy standards.
        </p>
      </Card>
    </div>
  )

  const renderPersonalityView = () => (
    <PersonalitySelection
      onSelectPersonality={(personality) => {
        setSelectedPersonality(personality)
        setCurrentView('phone')
        playSound('personality-switch')
        triggerCelebration('stars')
        setTimeout(() => triggerCelebration('emoji', personality.emoji), 300)
        toast.success(`${personality.name} is now your AI friend!`)
      }}
      onBack={() => {
        handleButtonPress('back-button', 'whoosh')
        setCurrentView('phone')
      }}
      currentPersonality={selectedPersonality}
    />
  )

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, oklch(0.97 0.04 35) 0%, oklch(0.95 0.06 45) 25%, oklch(0.96 0.05 55) 50%, oklch(0.94 0.07 35) 75%, oklch(0.96 0.04 40) 100%)'
    }}>
      {/* Cute Animation Overlays */}
      <FloatingHearts active={showHearts} count={8} />
      <TwinklingStars active={showStars} count={12} />
      <ConfettiBurst active={showConfetti} />
      <EmojiReaction emoji={currentEmoji} active={showEmojiReaction} />
      
      {currentView === 'phone' && renderPhoneView()}
      {currentView === 'history' && renderHistoryView()}
      {currentView === 'settings' && renderSettingsView()}
      {currentView === 'personality' && renderPersonalityView()}
      
      {/* Drawing Canvas Modal */}
      <DrawingCanvas
        isOpen={isDrawingOpen}
        onClose={() => setIsDrawingOpen(false)}
        onShareDrawing={handleDrawingShare}
        personality={selectedPersonality}
      />
      
      {/* Voice Debugger Modal */}
      <VoiceDebugger
        isOpen={isDebuggerOpen}
        onClose={() => setIsDebuggerOpen(false)}
      />
      
      {/* Sound Toggle Button */}
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          id="sound-toggle"
          onClick={() => {
            setSoundEnabled(!soundEnabled)
            playSound(soundEnabled ? 'error-boop' : 'success-chime')
            triggerCelebration('emoji', soundEnabled ? '🔇' : '🔊')
          }}
          variant="outline"
          size="sm"
          className="cute-card border-2 border-accent/30 hover:border-accent/50"
        >
          <WigglyIcon active={!soundEnabled}>
            {soundEnabled ? '🔊' : '🔇'}
          </WigglyIcon>
        </Button>
      </div>
    </div>
  )
}