import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from '@phosphor-icons/react'
import { AIPersonality, AI_PERSONALITIES } from '@/types/personality'
import ParticleEffects from '@/components/ParticleEffects'

interface PersonalitySelectionProps {
  onSelectPersonality: (personality: AIPersonality) => void
  onBack: () => void
  currentPersonality?: AIPersonality
}

export default function PersonalitySelection({ onSelectPersonality, onBack, currentPersonality }: PersonalitySelectionProps) {
  const [selectedPersonality, setSelectedPersonality] = useState<AIPersonality | null>(currentPersonality || null)

  const handleSelect = (personality: AIPersonality) => {
    setSelectedPersonality(personality)
    onSelectPersonality(personality)
  }

  return (
    <div 
      className="min-h-screen p-6"
      style={{
        background: 'linear-gradient(135deg, oklch(0.97 0.04 35) 0%, oklch(0.95 0.06 45) 25%, oklch(0.96 0.05 55) 50%, oklch(0.94 0.07 35) 75%, oklch(0.96 0.04 40) 100%)'
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="p-2 cute-card border-2 border-primary/30"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground cute-bounce">Choose Your AI Friend</h1>
            <p className="text-muted-foreground">Each friend has their own personality and conversation style</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {AI_PERSONALITIES.map((personality) => (
            <Card 
              key={personality.id}
              className={`
                cute-card p-6 cursor-pointer transition-all duration-300 hover:scale-105 cute-pulse
                ${selectedPersonality?.id === personality.id 
                  ? 'ring-4 ring-primary shadow-xl border-4' 
                  : 'hover:shadow-lg border-2'
                }
              `}
              onClick={() => handleSelect(personality)}
              style={{
                borderColor: selectedPersonality?.id === personality.id ? personality.color : 'rgba(255, 255, 255, 0.3)'
              }}
            >
              <div className="text-center space-y-4">
                {/* Avatar */}
                <div className="relative">
                  {/* Particle effects on hover */}
                  <ParticleEffects 
                    isActive={false}
                    color={personality.color}
                    intensity="low"
                    type={
                      personality.id === 'cheerful-buddy' ? 'sparkles' :
                      personality.id === 'gentle-friend' ? 'hearts' :
                      personality.id === 'silly-joker' ? 'mixed' :
                      personality.id === 'wise-owl' ? 'stars' :
                      personality.id === 'creative-artist' ? 'mixed' :
                      'sparkles'
                    }
                    hoverEffect={true}
                  />
                  
                  <div 
                    className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl cute-bounce shadow-lg relative z-10"
                    style={{ 
                      backgroundColor: `${personality.color}20`,
                      background: `radial-gradient(circle, ${personality.color}25 0%, ${personality.color}15 100%)`
                    }}
                  >
                    {personality.emoji}
                  </div>
                  {selectedPersonality?.id === personality.id && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full animate-bounce z-20"></div>
                  )}
                </div>

                {/* Name and Description */}
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-foreground">
                    {personality.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {personality.description}
                  </p>
                </div>

                {/* Conversation Style */}
                <div className="space-y-2">
                  <Badge 
                    variant="secondary" 
                    className="text-xs cute-card border-0"
                    style={{ backgroundColor: `${personality.color}15` }}
                  >
                    {personality.conversationStyle.responseStyle}
                  </Badge>
                </div>

                {/* Topics */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Loves to talk about:</p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {personality.conversationStyle.topics.slice(0, 3).map((topic, index) => (
                      <Badge key={index} variant="outline" className="text-xs cute-card border border-muted">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Selection Indicator */}
                {selectedPersonality?.id === personality.id && (
                  <div className="mt-4">
                    <Badge 
                      className="bg-green-400 text-white cute-wiggle"
                    >
                      ✓ Selected
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Selected Personality Preview */}
        {selectedPersonality && (
          <Card className="cute-card p-6 border-4" style={{ borderColor: `${selectedPersonality.color}50` }}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl cute-pulse shadow-lg"
                  style={{ 
                    backgroundColor: `${selectedPersonality.color}20`,
                    background: `radial-gradient(circle, ${selectedPersonality.color}30 0%, ${selectedPersonality.color}15 100%)`
                  }}
                >
                  {selectedPersonality.emoji}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    You selected {selectedPersonality.name}!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    They'll greet you with their special style
                  </p>
                </div>
              </div>
              
              <div className="cute-card p-4 border-2 border-white/50">
                <p className="text-sm text-foreground italic">
                  "{selectedPersonality.conversationStyle.greeting}"
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline" className="cute-card border border-muted">
                  Voice: {selectedPersonality.voiceSettings.rate > 1 ? 'Fast' : selectedPersonality.voiceSettings.rate < 0.9 ? 'Slow' : 'Normal'} pace
                </Badge>
                <Badge variant="outline" className="cute-card border border-muted">
                  Tone: {selectedPersonality.voiceSettings.pitch > 1.1 ? 'High' : selectedPersonality.voiceSettings.pitch < 0.95 ? 'Low' : 'Normal'} pitch
                </Badge>
              </div>
            </div>
          </Card>
        )}

        {selectedPersonality && (
          <div className="text-center">
            <Button
              onClick={onBack}
              size="lg"
              className="button-text h-16 px-8 rounded-full shadow-lg hover:shadow-xl transition-all cute-bounce text-white"
              style={{ 
                background: `linear-gradient(135deg, ${selectedPersonality.color} 0%, ${selectedPersonality.color}cc 100%)`,
                border: '3px solid white'
              }}
            >
              <span className="text-lg">Start Chatting with {selectedPersonality.name}!</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}