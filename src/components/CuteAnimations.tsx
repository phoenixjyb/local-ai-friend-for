import { useEffect, useState } from 'react'
import { Heart, Star, Sparkle, SmileyWink, Rainbow, Sun, Moon } from '@phosphor-icons/react'

interface FloatingElementProps {
  children: React.ReactNode
  duration?: number
  delay?: number
  className?: string
}

/**
 * Floating animation component for cute elements
 */
export function FloatingElement({ children, duration = 3000, delay = 0, className = '' }: FloatingElementProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  if (!isVisible) return null

  return (
    <div 
      className={`floating-element ${className}`}
      style={{
        animationDuration: `${duration}ms`,
        animationDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  )
}

/**
 * Animated hearts that float up
 */
export function FloatingHearts({ count = 5, active = false }: { count?: number; active?: boolean }) {
  const [hearts, setHearts] = useState<Array<{ id: number; delay: number; size: number; duration: number }>>([])

  useEffect(() => {
    if (active) {
      const newHearts = Array.from({ length: count }, (_, i) => ({
        id: Date.now() + i,
        delay: i * 200,
        size: Math.random() * 0.5 + 0.5, // 0.5 to 1
        duration: Math.random() * 2000 + 3000 // 3-5 seconds
      }))
      setHearts(newHearts)

      const cleanup = setTimeout(() => setHearts([]), 6000)
      return () => clearTimeout(cleanup)
    }
  }, [active, count])

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {hearts.map((heart) => (
        <FloatingElement
          key={heart.id}
          duration={heart.duration}
          delay={heart.delay}
          className="absolute left-1/2 bottom-20 transform -translate-x-1/2"
        >
          <Heart 
            size={32 * heart.size} 
            weight="fill" 
            className="text-red-400 floating-heart opacity-80"
          />
        </FloatingElement>
      ))}
    </div>
  )
}

/**
 * Twinkling stars effect
 */
export function TwinklingStars({ count = 8, active = false }: { count?: number; active?: boolean }) {
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number; delay: number; size: number }>>([])

  useEffect(() => {
    if (active) {
      const newStars = Array.from({ length: count }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100, // percentage
        y: Math.random() * 60 + 10, // 10-70% from top
        delay: i * 150,
        size: Math.random() * 0.4 + 0.6 // 0.6 to 1
      }))
      setStars(newStars)

      const cleanup = setTimeout(() => setStars([]), 4000)
      return () => clearTimeout(cleanup)
    }
  }, [active, count])

  return (
    <div className="fixed inset-0 pointer-events-none z-20">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute twinkling-star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            animationDelay: `${star.delay}ms`
          }}
        >
          <Star 
            size={20 * star.size} 
            weight="fill" 
            className="text-yellow-400"
          />
        </div>
      ))}
    </div>
  )
}

/**
 * Magic sparkles around an element
 */
export function MagicSparkles({ active = false, intensity = 'medium' }: { 
  active?: boolean 
  intensity?: 'low' | 'medium' | 'high'
}) {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; delay: number; rotation: number }>>([])

  const sparkleCount = intensity === 'low' ? 3 : intensity === 'medium' ? 6 : 12

  useEffect(() => {
    if (active) {
      const newSparkles = Array.from({ length: sparkleCount }, (_, i) => ({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 200, // -100 to 100 pixels from center
        y: (Math.random() - 0.5) * 200,
        delay: i * 100,
        rotation: Math.random() * 360
      }))
      setSparkles(newSparkles)

      const cleanup = setTimeout(() => setSparkles([]), 3000)
      return () => clearTimeout(cleanup)
    }
  }, [active, sparkleCount])

  return (
    <div className="absolute inset-0 pointer-events-none">
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute top-1/2 left-1/2 magic-sparkle"
          style={{
            transform: `translate(${sparkle.x}px, ${sparkle.y}px) rotate(${sparkle.rotation}deg)`,
            animationDelay: `${sparkle.delay}ms`
          }}
        >
          <Sparkle size={16} weight="fill" className="text-purple-400" />
        </div>
      ))}
    </div>
  )
}

/**
 * Bouncing emoji reactions
 */
export function EmojiReaction({ emoji, active = false }: { emoji: string; active?: boolean }) {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (active) {
      setIsActive(true)
      const timer = setTimeout(() => setIsActive(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [active])

  if (!isActive) return null

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-40">
      <div className="text-6xl cute-bounce animate-fade-in-up">
        {emoji}
      </div>
    </div>
  )
}

/**
 * Rainbow trail effect
 */
export function RainbowTrail({ active = false }: { active?: boolean }) {
  if (!active) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      <div className="absolute top-10 left-10 rainbow-animation">
        <Rainbow size={48} weight="fill" className="text-red-400" />
      </div>
      <div className="absolute top-20 right-20 rainbow-animation" style={{ animationDelay: '0.5s' }}>
        <Rainbow size={32} weight="fill" className="text-blue-400" />
      </div>
      <div className="absolute bottom-20 left-1/4 rainbow-animation" style={{ animationDelay: '1s' }}>
        <Rainbow size={40} weight="fill" className="text-green-400" />
      </div>
    </div>
  )
}

/**
 * Pulsing glow effect for buttons
 */
export function PulsingGlow({ children, active = false, color = 'primary' }: {
  children: React.ReactNode
  active?: boolean
  color?: 'primary' | 'accent' | 'success' | 'warning'
}) {
  const glowColors = {
    primary: 'shadow-primary/50',
    accent: 'shadow-accent/50',
    success: 'shadow-green-400/50',
    warning: 'shadow-yellow-400/50'
  }

  return (
    <div className={`relative ${active ? 'cute-pulse' : ''}`}>
      {active && (
        <div 
          className={`absolute inset-0 rounded-full blur-lg ${glowColors[color]} animate-pulse`}
          style={{ animation: 'cute-glow 2s ease-in-out infinite' }}
        />
      )}
      {children}
    </div>
  )
}

/**
 * Confetti burst effect
 */
export function ConfettiBurst({ active = false }: { active?: boolean }) {
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number; rotation: number }>>([])

  useEffect(() => {
    if (active) {
      const colors = ['text-red-400', 'text-blue-400', 'text-green-400', 'text-yellow-400', 'text-purple-400', 'text-pink-400']
      const newConfetti = Array.from({ length: 20 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: i * 50,
        rotation: Math.random() * 360
      }))
      setConfetti(newConfetti)

      const cleanup = setTimeout(() => setConfetti([]), 3000)
      return () => clearTimeout(cleanup)
    }
  }, [active])

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-2 h-2 rounded-full confetti-fall"
          style={{
            left: `${piece.x}%`,
            top: `-10px`,
            backgroundColor: piece.color.replace('text-', '').replace('-400', ''),
            animationDelay: `${piece.delay}ms`,
            transform: `rotate(${piece.rotation}deg)`
          }}
        />
      ))}
    </div>
  )
}

/**
 * Breathing animation for the AI avatar
 */
export function BreathingAvatar({ children, isActive = false }: { 
  children: React.ReactNode
  isActive?: boolean 
}) {
  return (
    <div className={`${isActive ? 'cute-breathe' : 'cute-bounce'} transition-all duration-300`}>
      {children}
    </div>
  )
}

/**
 * Wiggling icon animation
 */
export function WigglyIcon({ children, active = false }: {
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <div className={`${active ? 'cute-wiggle' : ''} transition-all duration-200`}>
      {children}
    </div>
  )
}