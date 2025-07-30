import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from '@phosphor-icons/react'
import { AIPersonality, AI_PERSONALITIES } from '@/types/personality'

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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Choose Your AI Friend</h1>
            <p className="text-muted-foreground">Each friend has their own personality and conversation style</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {AI_PERSONALITIES.map((personality) => (
            <Card 
              key={personality.id}
              className={`
                p-6 cursor-pointer transition-all duration-200 hover:scale-105 
                ${selectedPersonality?.id === personality.id 
                  ? 'ring-2 ring-primary shadow-lg' 
                  : 'hover:shadow-md'
                }
              `}
              onClick={() => handleSelect(personality)}
              style={{
                borderColor: selectedPersonality?.id === personality.id ? personality.color : undefined
              }}
            >
              <div className="text-center space-y-4">
                {/* Avatar */}
                <div 
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl"
                  style={{ backgroundColor: `${personality.color}20` }}
                >
                  {personality.emoji}
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
                    className="text-xs"
                    style={{ backgroundColor: `${personality.color}15` }}
                  >
                    {personality.conversationStyle.responseStyle}
                  </Badge>
                </div>

                {/* Topics */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Loves to talk about:</p>
                  <div className="flex flex-wrap gap-1">
                    {personality.conversationStyle.topics.slice(0, 3).map((topic, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Selection Indicator */}
                {selectedPersonality?.id === personality.id && (
                  <div className="mt-4">
                    <Badge 
                      className="bg-primary text-primary-foreground"
                    >
                      Selected
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Selected Personality Preview */}
        {selectedPersonality && (
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${selectedPersonality.color}20` }}
                >
                  {selectedPersonality.emoji}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    You selected {selectedPersonality.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    They'll greet you with their special style
                  </p>
                </div>
              </div>
              
              <div className="bg-background/50 p-4 rounded-lg">
                <p className="text-sm text-foreground italic">
                  "{selectedPersonality.conversationStyle.greeting}"
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  Voice: {selectedPersonality.voiceSettings.rate > 1 ? 'Fast' : selectedPersonality.voiceSettings.rate < 0.9 ? 'Slow' : 'Normal'} pace
                </Badge>
                <Badge variant="outline">
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
              className="button-text h-14 px-8"
              style={{ backgroundColor: selectedPersonality.color }}
            >
              Start Chatting with {selectedPersonality.name}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}