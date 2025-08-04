import { useState, useEffect, useRef, useCallback } from 'react'
import { Phone, PhoneX, SpeakerHigh, ClockCounterClockwise, Gear, Heart, WifiSlash, Brain, User, Palette } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { loggingService } from '@/services/LoggingService'

// Simple localStorage-based hook to replace useKV
function useKV<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const setValue = useCallback((value: T) => {
    setState(value)
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  }, [key])

  return [state, setValue]
}
import PersonalitySelection from '@/components/PersonalitySelection'
import ParticleEffects from '@/components/ParticleEffects'
import DrawingCanvas from '@/components/DrawingCanvas'
import AudioVisualization from '@/components/AudioVisualization'
import SamsungAIPanel from '@/components/SamsungAIPanel'
import { AIPersonality, AI_PERSONALITIES } from '@/types/personality'
import { voiceChatService } from '@/services/VoiceChatService'
import { ollamaService } from '@/services/OllamaService'
import { soundEffectsService } from '@/services/SoundEffectsService'
import { samsungS24Service } from '@/services/SamsungS24Service'
import DebugPanel from '@/components/DebugPanel'
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
  const [isDebugOpen, setIsDebugOpen] = useState(false)
  
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
  const recognitionRef = useRef<any>(null) // Using any for web speech recognition compatibility
  const synthRef = useRef<SpeechSynthesis | null>(null)

  // Helper functions for cute animations and sounds
  const playSound = useCallback((soundType: any, volume = 0.7) => {
    if (soundEnabled) {
      soundEffectsService.play(soundType, volume)
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
    soundEffectsService.setEnabled(soundEnabled)
  }, [soundEnabled])

  // Initialize native services if running in Capacitor
  useEffect(() => {
    const initializeNativeServices = async () => {
      if (Capacitor.isNativePlatform()) {
        setIsNativeApp(true)
        
        // Initialize voice services
        await voiceChatService.initializeVoiceServices()
        toast.success('Native voice services initialized!')
        
        // Initialize Samsung S24 Ultra specific features
        try {
          const samsungInitialized = await samsungS24Service.initialize()
          if (samsungInitialized && samsungS24Service.isS24Ultra()) {
            toast.success('🔥 Samsung S24 Ultra optimizations activated!')
            await samsungS24Service.playHapticFeedback('success')
          }
        } catch (error) {
          console.warn('Samsung S24 service initialization failed:', error)
        }
      }
    }
    
    initializeNativeServices()
  }, [])

  // Generate AI response with proper LLM integration (Local Ollama + Samsung S24 Ultra optimizations)
  const generateAIResponse = useCallback(async (userInput: string) => {
    try {
      // Use personality-specific prompt template
      const promptTemplate = selectedPersonality.conversationStyle.promptTemplate
      const personalizedPrompt = promptTemplate.replace('{input}', userInput)

      // Try local LLM first (Ollama on Samsung S24 Ultra via Termux)
      if (localLLMAvailable && ollamaService.getConnectionStatus()) {
        try {
          console.log('🤖 Using local LLM (Ollama) for Samsung S24 Ultra...')
          const response = await ollamaService.generatePersonalizedResponse(userInput, selectedPersonality.id)
          if (response && response.length > 0) {
            console.log('✅ Local LLM response generated')
            return response
          }
        } catch (error) {
          console.error('❌ Local LLM failed:', error)
          toast.warning('Local AI failed, using fallback responses')
        }
      }

      // Use cloud LLM if online and local LLM not available
      if (isOnline) {
        console.log('☁️ Attempting cloud LLM for response generation...')
        // TODO: Integrate actual cloud LLM service (currently disabled for Samsung S24 focus)
        console.log('⚠️ Cloud LLM not implemented - using personality-based fallback')
      }

      // Fallback to personality-specific responses
      console.log('📱 Using personality-based fallback responses')
      const personalityResponses = getPersonalityFallbackResponses(selectedPersonality)
      return personalityResponses[Math.floor(Math.random() * personalityResponses.length)]

    } catch (error) {
      console.error('❌ Error generating AI response:', error)
      toast.error('AI response failed. Please try again.')
      return "I'm sorry, I didn't quite catch that. Could you say that again?"
    }
  }, [isOnline, selectedPersonality, localLLMAvailable])

  // Handle speech recognition (unified for web and native) - Define this first
  const startListening = useCallback(async () => {
    loggingService.logASR('Starting voice recognition...', { 
      isNativeApp, 
      callState, 
      aiSpeaking,
      isListening: isListening
    })
    
    if (isNativeApp && voiceChatService.isNativeVoiceAvailable()) {
      // Use native speech recognition (Samsung S24 Ultra optimized)
      setIsListening(true)
      try {
        loggingService.logASR('Using native speech recognition (Samsung S24 Ultra)')
        const transcript = await voiceChatService.startListening()
        
        loggingService.logASR('Native ASR result', { transcript, length: transcript?.length })
        
        if (transcript && transcript.trim()) {
          setIsListening(false)
          loggingService.logASR('Processing transcript', { transcript })
          
          const aiResponse = await generateAIResponse(transcript)
          await speakResponse(aiResponse)
          
          // Save to conversation
          if (currentConversationId) {
            const timestamp = Date.now()
            loggingService.info('UI', 'Conversation turn completed', {
              conversationId: currentConversationId,
              userInput: transcript,
              aiResponse,
              timestamp
            })
          }
        } else {
          loggingService.logASRError('Empty transcript received from native ASR')
          setIsListening(false)
          toast.warning('No speech detected. Please try again.')
        }
        setIsListening(false)
      } catch (error) {
        loggingService.logASRError('Native speech recognition failed', error)
        setIsListening(false)
        toast.error('Voice recognition failed. Please try again.')
      }
    } else {
      // Use web speech recognition with improved error handling
      if (!recognitionRef.current) {
        loggingService.logASRError('Web speech recognition not available')
        toast.error('Voice recognition not available')
        return
      }
      
      try {
        // Stop any existing recognition first
        if (isListening) {
          loggingService.logASR('Stopping existing recognition session')
          recognitionRef.current.stop()
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        loggingService.logASR('Starting web speech recognition...')
        setIsListening(true)
        recognitionRef.current.start()
        
      } catch (error) {
        loggingService.logASRError('Web speech recognition start error', error)
        setIsListening(false)
        
        // Handle specific errors
        if (error.name === 'InvalidStateError') {
          loggingService.logASR('Retrying after InvalidStateError')
          toast.info('Restarting voice recognition...')
          // Wait a bit and try again
          setTimeout(() => {
            if (callState === 'active' && !aiSpeaking) {
              startListening()
            }
          }, 1000)
        } else if (error.name === 'NotAllowedError') {
          loggingService.logASRError('Microphone permission denied')
          toast.error('Microphone permission denied. Please allow microphone access.')
        } else {
          toast.error('Voice recognition failed. Please try again.')
        }
      }
    }
  }, [isNativeApp, currentConversationId, callState, aiSpeaking, isListening, generateAIResponse])

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

  // Check for local LLM availability and enable Samsung S24 Ultra optimizations
  useEffect(() => {
    const checkLocalLLM = async () => {
      loggingService.logLLM('Starting local LLM availability check...')
      
      try {
        // Check if Ollama is available on Samsung S24 Ultra via Termux
        loggingService.logLLM('Platform detection', { 
          isNative: Capacitor.isNativePlatform(),
          platform: Capacitor.getPlatform(),
          userAgent: navigator.userAgent 
        })
        loggingService.logLLM('Checking Ollama connection (multiple URLs for Android)')
        const available = await ollamaService.checkConnection()
        
        loggingService.logLLM('Ollama connection check result', { available })
        
        if (available) {
          loggingService.logLLM('Ollama connected! Initializing...')
          const initialized = await ollamaService.initialize()
          setLocalLLMAvailable(initialized)
          
          loggingService.logLLM('Ollama initialization result', { initialized })
          
          if (initialized && samsungS24Service.isS24Ultra()) {
            loggingService.system('Samsung S24 Ultra + Local AI fully ready!')
            toast.success('🔥 Samsung S24 Ultra + Local AI ready!')
          } else if (initialized) {
            loggingService.system('Local AI ready!')
            toast.success('🤖 Local AI ready!')
          }
        } else {
          loggingService.logLLM('Local LLM not available - using fallback responses')
          setLocalLLMAvailable(false)
          toast.info('💡 Install Ollama in Termux for local AI conversations')
        }
      } catch (error) {
        console.error('❌ Error checking local LLM:', error)
        setLocalLLMAvailable(false)
      }
    }
    
    checkLocalLLM()
  }, [])

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

  // Initialize speech APIs with better error handling
  useEffect(() => {
    const initializeSpeechApis = async () => {
      // Check for speech recognition support
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-GB'
        recognitionRef.current.maxAlternatives = 1
        
        toast.success('🎤 Voice recognition ready!')
      } else {
        toast.warning('Voice recognition not supported in this browser')
      }
      
      // Check for speech synthesis support
      if ('speechSynthesis' in window) {
        synthRef.current = window.speechSynthesis
        
        // Wait for voices to load
        const waitForVoices = () => {
          return new Promise<void>((resolve) => {
            const voices = synthRef.current?.getVoices() || []
            if (voices.length > 0) {
              console.log('✅ Speech Synthesis voices loaded:', voices.length)
              resolve()
            } else {
              synthRef.current?.addEventListener('voiceschanged', () => {
                const newVoices = synthRef.current?.getVoices() || []
                console.log('✅ Speech Synthesis voices loaded:', newVoices.length)
                resolve()
              }, { once: true })
            }
          })
        }
        
        await waitForVoices()
        console.log('✅ Speech Synthesis initialized')
      } else {
        toast.warning('Text-to-speech not supported in this browser')
      }
      
      // Request microphone permission
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        console.log('✅ Microphone permission granted')
        toast.success('🎤 Microphone access granted!')
      } catch (error) {
        console.error('❌ Microphone permission error:', error)
        toast.error('Please allow microphone access for voice features')
      }
    }
    
    initializeSpeechApis()
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
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get personality-specific fallback responses
  const getPersonalityFallbackResponses = (personality: AIPersonality) => {
    switch (personality.id) {
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
          "That sounds brilliant! I'd love to hear more."
        ]
    }
  }

  // Handle speech recognition
  useEffect(() => {
    if (isNativeApp) return // Skip web speech setup for native app
    
    if (!recognitionRef.current) return

    recognitionRef.current.onresult = async (event) => {
      console.log('🎤 Speech recognition result received')
      const result = event.results[event.results.length - 1]
      if (result.isFinal) {
        const transcript = result[0].transcript.trim()
        console.log('📝 Final transcript:', transcript)
        if (transcript && transcript.length > 2) {
          setIsListening(false)
          playSound('success-chime', 0.6)
          triggerCelebration('emoji', '👂')
          toast.success(`Heard: "${transcript}"`)
          
          console.log('🤖 Generating AI response...')
          const aiResponse = await generateAIResponse(transcript)
          console.log('💬 AI response ready:', aiResponse.substring(0, 50) + '...')
          await speakResponse(aiResponse)
        } else {
          console.log('⚠️ Transcript too short, continuing to listen...')
          // Continue listening if transcript is too short
          setTimeout(() => {
            if (callState === 'active' && !aiSpeaking) {
              startListening()
            }
          }, 500)
        }
      } else {
        // Show interim results
        const interimTranscript = result[0].transcript
        if (interimTranscript.length > 5) {
          console.log('🔄 Interim transcript:', interimTranscript)
        }
      }
    }

    recognitionRef.current.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error)
      setIsListening(false)
      playSound('error-boop')
      triggerCelebration('emoji', '🤔')
      
      // Different error handling
      if (event.error === 'no-speech') {
        toast.info('No speech detected. Trying again...')
        // Restart listening after a short delay
        setTimeout(() => {
          if (callState === 'active' && !aiSpeaking) {
            startListening()
          }
        }, 1500)
      } else if (event.error === 'audio-capture') {
        toast.error('Microphone access denied. Please allow microphone access.')
      } else if (event.error === 'not-allowed') {
        toast.error('Microphone permission needed. Please allow and refresh.')
      } else {
        toast.error(`Voice recognition error: ${event.error}. Trying again...`)
        // Restart listening after error
        setTimeout(() => {
          if (callState === 'active' && !aiSpeaking) {
            startListening()
          }
        }, 2000)
      }
    }

    recognitionRef.current.onstart = () => {
      console.log('🎤 Speech recognition started')
      setIsListening(true)
      playSound('pop', 0.4)
      triggerCelebration('sparkles')
      toast.info('🎤 Listening...')
    }

    recognitionRef.current.onend = () => {
      console.log('🛑 Speech recognition ended')
      if (callState === 'active' && !aiSpeaking && isListening) {
        // Restart listening if call is still active and we were listening
        console.log('🔄 Restarting speech recognition...')
        setTimeout(() => {
          if (callState === 'active' && !aiSpeaking) {
            startListening()
          }
        }, 1000)
      } else {
        setIsListening(false)
      }
    }
  }, [callState, aiSpeaking, generateAIResponse, speakResponse, isNativeApp, isListening])

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
    
    // Simulate connection delay with cute sound
    setTimeout(async () => {
      setCallState('active')
      triggerCelebration('emoji', '🎉')
      playSound('success-chime')
      toast.success('Connected to your AI friend!')
      
      // AI greeting with personality
      const greeting = `Hello! I'm ${selectedPersonality.name} and I'm so excited to chat with you! ${selectedPersonality.conversationStyle.greeting}`
      await speakResponse(greeting)
      
      // Start listening after greeting with longer delay to ensure TTS finishes
      setTimeout(() => {
        if (callState === 'active') {
          console.log('🎤 Starting voice recognition after greeting...')
          startListening()
        }
      }, 5000) // Increased delay to let greeting finish
    }, 1500)
  }

  // Handle sharing drawings with AI (Local Ollama + Cloud fallback)
  const handleDrawingShare = useCallback(async (imageData: string) => {
    try {
      // Create a prompt for the AI to respond to the drawing
      const basePrompt = `A child has just drawn a picture and wants to show it to you. You are ${selectedPersonality.name}, ${selectedPersonality.description}. Please respond enthusiastically and encourage their creativity. Ask them about their drawing in a ${selectedPersonality.conversationStyle.responseStyle} way. Keep it short and age-appropriate for a 4-year-old.`
      
      let aiResponse
      
      // Try local LLM first (Samsung S24 Ultra Ollama)
      if (localLLMAvailable && ollamaService.getConnectionStatus()) {
        try {
          console.log('🤖 Using local LLM (Ollama) for drawing response...')
          aiResponse = await ollamaService.generatePersonalizedResponse(basePrompt, selectedPersonality.id)
        } catch (error) {
          console.error('❌ Local LLM failed for drawing response:', error)
          aiResponse = null
        }
      }
      
      // Fallback to cloud LLM if online and local LLM not available
      if (!aiResponse && isOnline) {
        console.log('☁️ Using cloud LLM for drawing response...')
        // TODO: Replace with actual cloud LLM service
        console.log('⚠️ Cloud LLM temporarily disabled for drawing - using fallback')
        const drawingResponses = getDrawingResponsesByPersonality(selectedPersonality)
        aiResponse = drawingResponses[Math.floor(Math.random() * drawingResponses.length)]
      }
      
      // Final fallback to personality-specific responses
      if (!aiResponse) {
        console.log('📱 Using personality-based drawing fallback')
        const drawingResponses = getDrawingResponsesByPersonality(selectedPersonality)
        aiResponse = drawingResponses[Math.floor(Math.random() * drawingResponses.length)]
      }
      
      triggerCelebration('confetti')
      await speakResponse(aiResponse)
      setIsDrawingOpen(false)
      
    } catch (error) {
      console.error('❌ Error generating drawing response:', error)
      const fallbackResponse = "What a wonderful drawing! You're such a talented artist!"
      await speakResponse(fallbackResponse)
      setIsDrawingOpen(false)
    }
  }, [selectedPersonality, isOnline, speakResponse])

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
      
      const updatedConversations = [newConversation, ...conversations.slice(0, 9)]
      setConversations(updatedConversations) // Keep last 10
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
      {/* Local LLM Status Indicator */}
      <div className="fixed top-4 left-4 z-50">
        <Card className={`cute-card p-3 ${localLLMAvailable 
          ? 'border-green-300 bg-green-50' 
          : 'border-orange-300 bg-orange-50'}`}>
          <div className={`flex items-center gap-2 text-sm ${localLLMAvailable 
            ? 'text-green-700' 
            : 'text-orange-700'}`}>
            <div className={`w-4 h-4 rounded-full ${localLLMAvailable 
              ? 'bg-green-500 animate-pulse' 
              : 'bg-orange-500'}`}></div>
            <div className="flex flex-col">
              <span className="font-medium">
                {localLLMAvailable ? 'Local AI Connected' : 'Local AI Offline'}
              </span>
              <span className={`text-xs ${localLLMAvailable 
                ? 'text-green-600' 
                : 'text-orange-600'}`}>
                {localLLMAvailable 
                  ? '🤖 Samsung S24 Ultra Ollama Ready' 
                  : '⚠️ Termux Ollama Not Available'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Network Status Indicator */}
      {!isOnline && (
        <div className="fixed top-16 left-4 right-4 z-50">
          <Card className="cute-card p-3 border-orange-300 bg-orange-50">
            <div className="flex items-center gap-2 text-sm text-orange-700">
              <WifiSlash size={16} />
              <span>Offline - {localLLMAvailable ? 'Using Local AI' : 'Limited Functionality'}</span>
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
              <SpeakerHigh size={16} className="mr-1" />
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
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {callState === 'idle' && (
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
                    <PhoneX size={24} />
                  </div>
                  <span>Hang Up</span>
                </div>
              </Button>
            </PulsingGlow>

            {/* Push to Talk Button - only show during active call */}
            {callState === 'active' && (
              <PulsingGlow active={isListening} color="accent">
                <Button
                  id="push-to-talk-button"
                  onClick={() => {
                    handleButtonPress('push-to-talk-button', 'pop')
                    if (!isListening) {
                      startListening()
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
            <SpeakerHigh size={20} className="mr-2 cute-bounce" />
          </WigglyIcon>
          Test Voice
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
            <ClockCounterClockwise size={20} className="mr-2" />
          </WigglyIcon>
          History
        </Button>

        <Button
          onClick={() => setCurrentView('settings')}
          variant="outline"
          size="lg"
          className="button-text h-16 cute-card border-2 border-muted-foreground/30 hover:border-muted-foreground/50 transition-all"
        >
          <Gear size={20} className="mr-2" />
          Settings
        </Button>

        {/* Debug Panel Button */}
        <Button
          id="debug-button"
          onClick={() => {
            handleButtonPress('debug-button', 'magic-sparkle')
            setIsDebugOpen(true)
          }}
          variant="outline"
          size="lg"
          className="button-text h-16 cute-card border-2 border-orange-300 hover:border-orange-400 transition-all text-orange-600 hover:text-orange-700"
        >
          <WigglyIcon active={lastButtonPressed === 'debug-button'}>
            🧪
          </WigglyIcon>
          Debug
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
            <li>• Local AI model support (via Ollama)</li>
            <li>• British English voice responses</li>
            <li>• Real-time audio visualization showing voice input levels</li>
            <li>• Vivid visual feedback when microphone detects sound</li>
            <li>• Child-friendly conversation topics</li>
            <li>• Easy interrupt and hang-up controls</li>
            <li>• Local conversation history</li>
            <li>• No personal data collection</li>
            <li>• Works completely offline with local AI</li>
          </ul>
        </div>
        
        <div className="mt-4 p-4 cute-card border-2 border-primary/20">
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
            <p className="text-xs font-medium mb-1">Current Status:</p>
            <p className="text-xs text-muted-foreground">
              Connection: {localLLMAvailable ? '✅ Connected' : '❌ Not detected'}
            </p>
            {localLLMAvailable && (
              <>
                <p className="text-xs text-muted-foreground">
                  Model: {ollamaService.getModelDisplayName()} ({ollamaService.getCurrentModel()})
                </p>
                <p className="text-xs text-green-600 font-medium mt-1">
                  🚀 Running locally on your Samsung S24 Ultra - No internet required!
                </p>
              </>
            )}
            {!localLLMAvailable && (
              <p className="text-xs text-orange-600 mt-1">
                💡 Start Ollama in Termux to enable offline AI conversations
              </p>
            )}
          </div>
        </div>
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

      {/* Samsung S24 Ultra AI Configuration Panel */}
      <SamsungAIPanel />
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

      {/* Debug Panel */}
      <DebugPanel
        isOpen={isDebugOpen}
        onOpenChange={setIsDebugOpen}
      />
    </div>
  )
}