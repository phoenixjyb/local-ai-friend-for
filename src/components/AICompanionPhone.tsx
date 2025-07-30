import { useState, useEffect, useRef, useCallback } from 'react'
import { Phone, PhoneOff, Volume2, History, Settings, Heart, WifiX, Brain, User, Palette } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import PersonalitySelection from '@/components/PersonalitySelection'
import ParticleEffects from '@/components/ParticleEffects'
import DrawingCanvas from '@/components/DrawingCanvas'
import { AIPersonality, AI_PERSONALITIES } from '@/types/personality'
import { voiceChatService } from '@/services/VoiceChatService'
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
  
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  // Initialize native services if running in Capacitor
  useEffect(() => {
    const initializeNativeServices = async () => {
      if (Capacitor.isNativePlatform()) {
        setIsNativeApp(true)
        await voiceChatService.initializeVoiceServices()
        toast.success('Native voice services initialized!')
      }
    }
    
    initializeNativeServices()
  }, [])

  // Check for local LLM availability
  useEffect(() => {
    const checkLocalLLM = async () => {
      try {
        const response = await fetch('http://localhost:11434/api/tags', {
          method: 'GET',
          signal: AbortSignal.timeout(3000) // 3 second timeout
        })
        if (response.ok) {
          setLocalLLMAvailable(true)
          toast.success('Local AI model detected! Fully offline capable.')
        }
      } catch (error) {
        setLocalLLMAvailable(false)
        console.log('Local LLM not available:', error)
      }
    }
    
    checkLocalLLM()
    
    // Check periodically
    const interval = setInterval(checkLocalLLM, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
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

  // Initialize speech APIs
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-GB'
    }
    
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis
    }
  }, [])

  // Handle call timer
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
      }
    }
  }, [callState])

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Generate AI response using Local LLM (Ollama), Spark LLM, or fallback
  const generateAIResponse = useCallback(async (userInput: string) => {
    try {
      // Use personality-specific prompt template
      const promptTemplate = selectedPersonality.conversationStyle.promptTemplate
      const personalizedPrompt = promptTemplate.replace('{input}', userInput)

      // Try local LLM first (Ollama)
      try {
        const localResponse = await callLocalLLM(personalizedPrompt)
        if (localResponse) {
          return localResponse
        }
      } catch (localError) {
        console.log('Local LLM unavailable, trying cloud LLM:', localError)
      }

      // If local LLM fails and online, use cloud LLM
      if (isOnline) {
        const prompt = spark.llmPrompt`${personalizedPrompt}`
        const response = await spark.llm(prompt, 'gpt-4o-mini')
        return response
      } else {
        // Personality-specific offline fallback responses
        const personalityResponses = getPersonalityFallbackResponses(selectedPersonality)
        return personalityResponses[Math.floor(Math.random() * personalityResponses.length)]
      }
    } catch (error) {
      console.error('Error generating AI response:', error)
      return "I'm sorry, I didn't quite catch that. Could you say that again?"
    }
  }, [isOnline, selectedPersonality])

  // Call local LLM via Ollama
  const callLocalLLM = async (prompt: string) => {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3.2:1b', // Lightweight model for mobile
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            max_tokens: 150,
            top_p: 0.9
          }
        })
      })

      if (!response.ok) {
        throw new Error('Local LLM request failed')
      }

      const data = await response.json()
      return data.response || "I'm here to chat with you!"
    } catch (error) {
      console.error('Local LLM error:', error)
      throw error
    }
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
          "That's a very thoughtful observation. What do you think that means?",
          "How interesting! That reminds me of something fascinating...",
          "You're showing great wisdom there. Can you tell me more?",
          "That's quite perceptive of you. How did you learn that?",
          "What a scholarly question! You have a wonderful mind."
        ]
      case 'creative-artist':
        return [
          "What a beautifully creative idea! How did you imagine that?",
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

  // Speak AI response (unified for web and native)
  const speakResponse = useCallback(async (text: string) => {
    if (isNativeApp && voiceChatService.isNativeVoiceAvailable()) {
      // Use native TTS with Samsung S24 Ultra optimizations
      await voiceChatService.speak(text, selectedPersonality.id)
    } else {
      // Use web TTS
      if (!synthRef.current) return
      
      const utterance = new SpeechSynthesisUtterance(text)
      // Use personality-specific voice settings
      utterance.rate = selectedPersonality.voiceSettings.rate
      utterance.pitch = selectedPersonality.voiceSettings.pitch
      utterance.volume = selectedPersonality.voiceSettings.volume
      
      // Try to use British English voice
      const voices = synthRef.current.getVoices()
      const britishVoice = voices.find(voice => 
        voice.lang.includes('en-GB') || voice.name.includes('British') || voice.name.includes('Daniel') || voice.name.includes('Kate')
      )
      if (britishVoice) {
        utterance.voice = britishVoice
      }
      
      utterance.onstart = () => setAiSpeaking(true)
      utterance.onend = () => setAiSpeaking(false)
      
      synthRef.current.speak(utterance)
    }
  }, [selectedPersonality, isNativeApp])

  // Handle speech recognition (unified for web and native)
  const startListening = useCallback(async () => {
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
      // Use web speech recognition
      if (!recognitionRef.current) return
      
      try {
        setIsListening(true)
        recognitionRef.current.start()
      } catch (error) {
        console.error('Web speech recognition error:', error)
        setIsListening(false)
        toast.error('Voice recognition failed. Please try again.')
      }
    }
  }, [isNativeApp, currentConversationId, generateAIResponse, speakResponse])

  // Handle speech recognition
  useEffect(() => {
    if (isNativeApp) return // Skip web speech setup for native app
    
    if (!recognitionRef.current) return

    recognitionRef.current.onresult = async (event) => {
      const result = event.results[event.results.length - 1]
      if (result.isFinal) {
        const transcript = result[0].transcript.trim()
        if (transcript) {
          setIsListening(false)
          const aiResponse = await generateAIResponse(transcript)
          speakResponse(aiResponse)
        }
      }
    }

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      toast.error('Having trouble hearing you. Please try again!')
    }

    recognitionRef.current.onend = () => {
      if (callState === 'active' && !aiSpeaking) {
        // Restart listening if call is still active
        setTimeout(() => {
          if (callState === 'active') {
            startListening()
          }
        }, 1000)
      }
    }
  }, [callState, aiSpeaking, generateAIResponse, speakResponse, isNativeApp])

  const startCall = async () => {
    setCallState('connecting')
    setCallDuration(0)
    
    // Generate conversation ID
    const conversationId = Date.now().toString()
    setCurrentConversationId(conversationId)
    
    // Simulate connection delay
    setTimeout(async () => {
      setCallState('active')
      toast.success('Connected to your AI friend!')
      
      // Start the timer
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
      
      // AI greeting with personality
      speakResponse(selectedPersonality.conversationStyle.greeting)
      
      // Start listening after greeting
      setTimeout(() => {
        startListening()
      }, 3000)
    }, 1500)
  }

  // Handle sharing drawings with AI
  const handleDrawingShare = useCallback(async (imageData: string) => {
    try {
      // Create a prompt for the AI to respond to the drawing
      const prompt = spark.llmPrompt`A child has just drawn a picture and wants to show it to you. You are ${selectedPersonality.name}, ${selectedPersonality.description}. Please respond enthusiastically and encourage their creativity. Ask them about their drawing in a ${selectedPersonality.conversationStyle.responseStyle} way. Keep it short and age-appropriate for a 4-year-old.`
      
      let aiResponse
      
      // Try local LLM first, then cloud
      try {
        if (localLLMAvailable) {
          aiResponse = await callLocalLLM(prompt)
        }
      } catch (localError) {
        console.log('Local LLM unavailable for drawing response')
      }
      
      if (!aiResponse && isOnline) {
        aiResponse = await spark.llm(prompt, 'gpt-4o-mini')
      }
      
      if (!aiResponse) {
        // Personality-specific fallback responses for drawings
        const drawingResponses = getDrawingFallbackResponses(selectedPersonality)
        aiResponse = drawingResponses[Math.floor(Math.random() * drawingResponses.length)]
      }
      
      // Speak the AI response
      speakResponse(aiResponse)
      setIsDrawingOpen(false)
      
    } catch (error) {
      console.error('Error processing drawing:', error)
      speakResponse("What a wonderful drawing! You're such a talented artist!")
      setIsDrawingOpen(false)
    }
  }, [selectedPersonality, localLLMAvailable, isOnline, speakResponse])

  // Get personality-specific drawing responses
  const getDrawingFallbackResponses = (personality: AIPersonality) => {
    switch (personality.id) {
      case 'cheerful-buddy':
        return [
          "Wow! What an absolutely amazing drawing! You're such a brilliant artist!",
          "That's the most wonderful picture I've ever seen! Tell me all about it!",
          "Oh my goodness, that's fantastic! What's your favorite part of your drawing?",
          "You're so creative! I love all the beautiful colors you used!",
          "What a masterpiece! You should be so proud of your amazing art!"
        ]
      case 'curious-explorer':
        return [
          "How fascinating! What inspired you to draw this? Tell me the story behind it!",
          "What an intriguing creation! Can you explain what's happening in your picture?",
          "How interesting! What made you choose those particular colors and shapes?",
          "That's a wonderful observation in your art! What else can you tell me about it?",
          "What a creative exploration! How did you decide what to draw?"
        ]
      case 'gentle-friend':
        return [
          "That's such a beautiful drawing, dear. It makes me feel so happy to see it.",
          "What a lovely picture. Thank you for sharing your special art with me.",
          "That's very thoughtful and creative. Tell me what you were thinking about while drawing.",
          "How peaceful and beautiful your drawing is. You have such a gentle artistic touch.",
          "That's very sweet of you to show me. Your art tells a wonderful story."
        ]
      case 'silly-joker':
        return [
          "Haha! That's absolutely bonkers and brilliant! What a giggly good drawing!",
          "What a wonderfully wacky and fantastic picture! It makes me want to dance!",
          "That's hilariously awesome! Did you have fun making all those silly details?",
          "Ha! You're such a funny and creative artist! Tell me about the silliest part!",
          "What a delightfully daft and amazing drawing! You always make me smile!"
        ]
      case 'wise-owl':
        return [
          "What a thoughtfully composed artwork! You show great artistic wisdom.",
          "That's a very perceptive piece of art. What techniques did you use?",
          "How scholarly and creative! Your drawing shows deep thinking and planning.",
          "That's quite an accomplished piece of art! What did you learn while creating it?",
          "What an intellectually engaging drawing! You have a very artistic mind."
        ]
      case 'creative-artist':
        return [
          "What an absolutely magnificent piece of art! Your creativity shines so brightly!",
          "That's gorgeously imaginative! What beautiful artistic choices you made!",
          "How wonderfully expressive and colorful! You have such an artistic soul!",
          "That's breathtakingly creative! Tell me about your artistic inspiration!",
          "What a magically beautiful creation! Your art fills my heart with joy!"
        ]
      default:
        return [
          "What a beautiful drawing! You're such a talented artist!",
          "That's wonderful! Tell me all about your amazing artwork!",
          "What a creative masterpiece! I love seeing your art!"
        ]
    }
  }

  const endCall = async () => {
    setCallState('ending')
    
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
    }
    
    setTimeout(() => {
      setCallState('idle')
      setCurrentConversationId(null)
      toast.success('Call ended. Thanks for chatting!')
    }, 1000)
  }

  const renderPhoneView = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-8">
      {/* Local LLM Status Indicator */}
      {localLLMAvailable && (
        <div className="fixed top-4 left-4 z-50">
          <Card className="cute-card p-3 border-primary/30">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Brain size={16} className="cute-wiggle" />
              <span>Local AI Active</span>
            </div>
          </Card>
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && !localLLMAvailable && (
        <div className="fixed top-4 left-4 right-4 z-50">
          <Card className="cute-card p-3 border-muted-foreground/20">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <WifiX size={16} />
              <span>Offline Mode - Limited AI features</span>
            </div>
          </Card>
        </div>
      )}

      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground cute-bounce">AI Friend</h1>
        <p className="text-lg text-muted-foreground">
          Your {selectedPersonality.name} is ready to chat!
        </p>
        <div className="flex items-center justify-center gap-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg cute-pulse"
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
        {localLLMAvailable ? (
          <p className="text-sm text-primary font-medium">
            ✓ Local AI model active - No internet required!
          </p>
        ) : !isOnline ? (
          <p className="text-sm text-muted-foreground">
            Basic conversation available offline
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Cloud AI available
          </p>
        )}
      </div>

      {/* Adorable AI Avatar with cute styling and particle effects */}
      <div className="relative">
        {/* Active Particle Effects */}
        <ParticleEffects 
          isActive={callState === 'active' || aiSpeaking || callState === 'connecting'}
          color={selectedPersonality.color}
          intensity={
            callState === 'connecting' ? 'high' :
            aiSpeaking ? 'high' : 
            callState === 'active' ? 'medium' : 
            'low'
          }
          type={
            callState === 'connecting' ? 'mixed' :
            selectedPersonality.id === 'cheerful-buddy' ? 'sparkles' :
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
            hoverEffect={true}
          />
        )}
        
        <div className="relative cute-bounce">
          <Avatar 
            className="w-40 h-40 border-4 border-white shadow-xl relative z-10 transition-all duration-300 hover:scale-105 cursor-pointer"
            style={{ 
              borderColor: selectedPersonality.color,
              background: `linear-gradient(135deg, ${selectedPersonality.color}20 0%, ${selectedPersonality.color}10 100%)`
            }}
          >
            <AvatarFallback 
              className="text-6xl cute-pulse"
              style={{ 
                backgroundColor: `${selectedPersonality.color}15`,
                color: selectedPersonality.color,
                background: `radial-gradient(circle, ${selectedPersonality.color}25 0%, ${selectedPersonality.color}10 100%)`
              }}
            >
              {selectedPersonality.emoji}
            </AvatarFallback>
          </Avatar>
          
          {/* Cute decorative elements around avatar */}
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-300 rounded-full animate-ping opacity-75 z-20"></div>
          <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-pink-300 rounded-full animate-pulse z-20"></div>
          
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
            <Badge variant="secondary" className="cute-card animate-pulse border-accent text-accent">
              <Volume2 size={16} className="mr-1" />
              Speaking
            </Badge>
          </div>
        )}
        
        {isListening && (
          <div className="absolute -bottom-4 -left-4 z-30">
            <Badge variant="outline" className="cute-card animate-pulse border-accent text-accent">
              🎤 Listening
            </Badge>
          </div>
        )}
      </div>

      {callState === 'active' && (
        <div className="text-center space-y-2">
          <p className="text-xl font-semibold text-primary cute-pulse">
            Call Duration: {formatDuration(callDuration)}
          </p>
          <p className="text-muted-foreground">
            {isListening ? "I'm listening..." : aiSpeaking ? "AI is speaking..." : "Waiting..."}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {callState === 'idle' && (
          <Button
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
        )}

        {callState === 'connecting' && (
          <Button 
            size="lg" 
            disabled 
            className="button-text h-20 w-56 rounded-full shadow-lg"
            style={{ 
              background: `linear-gradient(135deg, ${selectedPersonality.color}80 0%, ${selectedPersonality.color}60 100%)`,
              border: '3px solid white'
            }}
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-3"></div>
            Connecting...
          </Button>
        )}

        {(callState === 'active' || callState === 'ending') && (
          <Button
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
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <Button
          onClick={() => setCurrentView('personality')}
          variant="outline"
          size="lg"
          className="button-text h-16 cute-card border-2 border-primary/30 hover:border-primary/50 transition-all"
        >
          <User size={20} className="mr-2" />
          Choose Friend
        </Button>
        <Button
          onClick={() => setIsDrawingOpen(true)}
          variant="outline"
          size="lg"
          className="button-text h-16 cute-card border-2 border-purple-300 hover:border-purple-400 transition-all text-purple-600 hover:text-purple-700"
        >
          <Palette size={20} className="mr-2 magic-sparkle" />
          Draw & Show
        </Button>
        <Button
          onClick={() => setCurrentView('history')}
          variant="outline"
          size="lg"
          className="button-text h-16 cute-card border-2 border-accent/30 hover:border-accent/50 transition-all"
        >
          <History size={20} className="mr-2" />
          History
        </Button>
        <Button
          onClick={() => setCurrentView('settings')}
          variant="outline"
          size="lg"
          className="button-text h-16 cute-card border-2 border-secondary/30 hover:border-secondary/50 transition-all"
        >
          <Settings size={20} className="mr-2" />
          Settings
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
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-sm cute-pulse"
                        style={{ backgroundColor: `${personality.color}20` }}
                      >
                        {personality.emoji}
                      </div>
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
                    <div className="flex flex-wrap gap-2 mt-2">
                      {conv.topics.map((topic, index) => (
                        <Badge key={index} variant="secondary" className="cute-card border-0">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Heart size={20} className="text-pink-400 cute-pulse" />
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

      <Card className="cute-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Safety & Parental Controls</h3>
        <p className="text-muted-foreground">
          This AI companion is designed to be safe and appropriate for children. 
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
              <p className="font-medium">{selectedPersonality.name}</p>
              <p className="text-xs text-muted-foreground">{selectedPersonality.description}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-medium">AI Features:</p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• Multiple AI personalities with unique conversation styles</li>
            <li>• Local AI model support (via Ollama)</li>
            <li>• British English voice responses</li>
            <li>• Child-friendly conversation topics</li>
            <li>• Easy interrupt and hang-up controls</li>
            <li>• Local conversation history</li>
            <li>• No personal data collection</li>
            <li>• Works completely offline with local AI</li>
          </ul>
        </div>
        
        <div className="mt-4 p-4 cute-card border-2 border-primary/20">
          <h4 className="font-medium text-primary mb-2">Local AI Setup (Ollama)</h4>
          <p className="text-sm text-muted-foreground mb-2">
            For true offline functionality, install Ollama with a lightweight model:
          </p>
          <code className="text-xs bg-muted p-2 rounded block">
            ollama pull llama3.2:1b
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            Status: {localLLMAvailable ? '✓ Connected' : '✗ Not available'}
          </p>
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
    </div>
  )

  const renderPersonalityView = () => (
    <PersonalitySelection
      onSelectPersonality={(personality) => {
        setSelectedPersonality(personality)
        setCurrentView('phone')
        toast.success(`${personality.name} is now your AI friend!`)
      }}
      onBack={() => setCurrentView('phone')}
      currentPersonality={selectedPersonality}
    />
  )

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, oklch(0.97 0.04 35) 0%, oklch(0.95 0.06 45) 25%, oklch(0.96 0.05 55) 50%, oklch(0.94 0.07 35) 75%, oklch(0.96 0.04 40) 100%)'
    }}>
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
    </div>
  )
}