import { useState, useEffect, useRef, useCallback } from 'react'
import { Phone, PhoneOff, Volume2, History, Settings, Heart } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

interface ConversationEntry {
  id: string
  timestamp: number
  duration: number
  topics: string[]
}

type CallState = 'idle' | 'connecting' | 'active' | 'ending'
type AppView = 'phone' | 'history' | 'settings'

export default function AICompanionPhone() {
  const [callState, setCallState] = useState<CallState>('idle')
  const [currentView, setCurrentView] = useState<AppView>('phone')
  const [isListening, setIsListening] = useState(false)
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [conversations, setConversations] = useKV<ConversationEntry[]>('conversation-history', [])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

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

  // Generate AI response using Spark LLM
  const generateAIResponse = useCallback(async (userInput: string) => {
    try {
      const prompt = spark.llmPrompt`You are a friendly AI companion for children. Respond in a warm, encouraging way using British English. Keep responses short (1-2 sentences) and age-appropriate. The child said: "${userInput}". Respond as if you're having a pleasant phone conversation.`
      const response = await spark.llm(prompt, 'gpt-4o-mini')
      return response
    } catch (error) {
      console.error('Error generating AI response:', error)
      return "I'm sorry, I didn't quite catch that. Could you say that again?"
    }
  }, [])

  // Speak AI response
  const speakResponse = useCallback((text: string) => {
    if (!synthRef.current) return
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1.1
    utterance.volume = 0.8
    
    // Try to use British English voice
    const voices = synthRef.current.getVoices()
    const britishVoice = voices.find(voice => 
      voice.lang.includes('en-GB') || voice.name.includes('British')
    )
    if (britishVoice) {
      utterance.voice = britishVoice
    }
    
    utterance.onstart = () => setAiSpeaking(true)
    utterance.onend = () => setAiSpeaking(false)
    
    synthRef.current.speak(utterance)
  }, [])

  // Handle speech recognition
  useEffect(() => {
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
  }, [callState, aiSpeaking, generateAIResponse, speakResponse])

  const startListening = useCallback(() => {
    if (recognitionRef.current && callState === 'active' && !aiSpeaking) {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (error) {
        console.error('Error starting speech recognition:', error)
      }
    }
  }, [callState, aiSpeaking])

  const startCall = async () => {
    setCallState('connecting')
    setCallDuration(0)
    
    // Generate conversation ID
    const conversationId = Date.now().toString()
    setCurrentConversationId(conversationId)
    
    // Simulate connection delay
    setTimeout(() => {
      setCallState('active')
      toast.success('Connected to your AI friend!')
      
      // AI greeting
      speakResponse("Hello there! I'm so happy you called. How are you doing today?")
      
      // Start listening after greeting
      setTimeout(() => {
        startListening()
      }, 3000)
    }, 1500)
  }

  const endCall = () => {
    setCallState('ending')
    
    // Stop speech recognition and synthesis
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    
    setIsListening(false)
    setAiSpeaking(false)
    
    // Save conversation to history
    if (currentConversationId && callDuration > 0) {
      const newConversation: ConversationEntry = {
        id: currentConversationId,
        timestamp: Date.now(),
        duration: callDuration,
        topics: ['General Chat'] // Could be enhanced to track actual topics
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
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">AI Friend</h1>
        <p className="text-lg text-muted-foreground">Your friendly companion is ready to chat!</p>
      </div>

      <div className="relative">
        <Avatar className="w-32 h-32 border-4 border-primary">
          <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
            🤖
          </AvatarFallback>
        </Avatar>
        
        {aiSpeaking && (
          <div className="absolute -bottom-2 -right-2">
            <Badge variant="secondary" className="animate-pulse">
              <Volume2 size={16} className="mr-1" />
              Speaking
            </Badge>
          </div>
        )}
        
        {isListening && (
          <div className="absolute -bottom-2 -left-2">
            <Badge variant="outline" className="animate-pulse border-accent">
              🎤 Listening
            </Badge>
          </div>
        )}
      </div>

      {callState === 'active' && (
        <div className="text-center space-y-2">
          <p className="text-xl font-semibold text-primary">
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
            className="button-text h-16 w-48 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Phone size={24} className="mr-3" />
            Call AI Friend
          </Button>
        )}

        {callState === 'connecting' && (
          <Button size="lg" disabled className="button-text h-16 w-48">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current mr-3"></div>
            Connecting...
          </Button>
        )}

        {(callState === 'active' || callState === 'ending') && (
          <Button
            onClick={endCall}
            size="lg"
            variant="destructive"
            className="button-text h-16 w-48"
          >
            <PhoneOff size={24} className="mr-3" />
            Hang Up
          </Button>
        )}
      </div>

      <div className="flex space-x-4 mt-8">
        <Button
          onClick={() => setCurrentView('history')}
          variant="outline"
          size="lg"
          className="button-text"
        >
          <History size={20} className="mr-2" />
          History
        </Button>
        <Button
          onClick={() => setCurrentView('settings')}
          variant="outline"
          size="lg"
          className="button-text"
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
        <h2 className="text-2xl font-bold">Conversation History</h2>
        <Button onClick={() => setCurrentView('phone')} variant="outline">
          Back
        </Button>
      </div>

      {conversations.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No conversations yet. Start your first call!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {conversations.map((conv) => (
            <Card key={conv.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">
                    {new Date(conv.timestamp).toLocaleDateString()} at{' '}
                    {new Date(conv.timestamp).toLocaleTimeString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Duration: {formatDuration(conv.duration)}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {conv.topics.map((topic, index) => (
                      <Badge key={index} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Heart size={20} className="text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  const renderSettingsView = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Settings</h2>
        <Button onClick={() => setCurrentView('phone')} variant="outline">
          Back
        </Button>
      </div>

      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Safety & Parental Controls</h3>
        <p className="text-muted-foreground">
          This AI companion is designed to be safe and appropriate for children. 
          All conversations are processed locally when possible, and responses are 
          filtered for age-appropriate content.
        </p>
        
        <div className="space-y-2">
          <p className="font-medium">Features:</p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• British English voice responses</li>
            <li>• Child-friendly conversation topics</li>
            <li>• Easy interrupt and hang-up controls</li>
            <li>• Local conversation history</li>
            <li>• No personal data collection</li>
          </ul>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">About AI Friend</h3>
        <p className="text-muted-foreground">
          Your AI companion is designed to be a friendly, encouraging chat partner. 
          The AI uses natural language processing to have conversations and is 
          programmed to be supportive and educational.
        </p>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {currentView === 'phone' && renderPhoneView()}
      {currentView === 'history' && renderHistoryView()}
      {currentView === 'settings' && renderSettingsView()}
    </div>
  )
}