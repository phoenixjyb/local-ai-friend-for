import { useEffect, useState } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  rotation: number
  velocityX: number
  velocityY: number
  life: number
  maxLife: number
  color: string
  type: 'sparkle' | 'heart' | 'star' | 'circle'
}

interface ParticleEffectsProps {
  isActive: boolean
  color?: string
  intensity?: 'low' | 'medium' | 'high'
  type?: 'sparkles' | 'hearts' | 'stars' | 'mixed'
  hoverEffect?: boolean
}

export default function ParticleEffects({ 
  isActive, 
  color = '#fbbf24', 
  intensity = 'medium',
  type = 'mixed',
  hoverEffect = false
}: ParticleEffectsProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [isHovered, setIsHovered] = useState(false)

  const particleCount = {
    low: hoverEffect ? 5 : 8,
    medium: hoverEffect ? 8 : 15,
    high: hoverEffect ? 12 : 25
  }[intensity]

  const shouldShowParticles = isActive || (hoverEffect && isHovered)

  const createParticle = (): Particle => {
    const particleTypes: Particle['type'][] = 
      type === 'mixed' ? ['sparkle', 'heart', 'star', 'circle'] :
      type === 'sparkles' ? ['sparkle'] :
      type === 'hearts' ? ['heart'] :
      ['star']

    // Position around a circular area (avatar bounds)
    const angle = Math.random() * Math.PI * 2
    const radius = 80 + Math.random() * 40 // Around the avatar
    const centerX = 0
    const centerY = 0

    return {
      id: Math.random(),
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      size: 8 + Math.random() * 12,
      opacity: 0.7 + Math.random() * 0.3,
      rotation: Math.random() * 360,
      velocityX: (Math.random() - 0.5) * 2,
      velocityY: -0.5 - Math.random() * 1.5,
      life: 0,
      maxLife: 2000 + Math.random() * 1000, // 2-3 seconds
      color: color,
      type: particleTypes[Math.floor(Math.random() * particleTypes.length)]
    }
  }

  useEffect(() => {
    if (!shouldShowParticles) {
      setParticles([])
      return
    }

    // Initial particles
    const initialParticles = Array.from({ length: particleCount }, createParticle)
    setParticles(initialParticles)

    // Animation loop
    const animationInterval = setInterval(() => {
      setParticles(prevParticles => {
        return prevParticles
          .map(particle => ({
            ...particle,
            x: particle.x + particle.velocityX,
            y: particle.y + particle.velocityY,
            rotation: particle.rotation + 2,
            life: particle.life + 16, // ~60fps
            opacity: Math.max(0, particle.opacity * (1 - particle.life / particle.maxLife))
          }))
          .filter(particle => particle.life < particle.maxLife)
      })
    }, 16) // ~60fps

    // Particle generation
    const generationInterval = setInterval(() => {
      setParticles(prevParticles => {
        if (prevParticles.length < particleCount) {
          return [...prevParticles, createParticle()]
        }
        return prevParticles
      })
    }, hoverEffect ? 400 : 200) // Slower generation for hover effect

    return () => {
      clearInterval(animationInterval)
      clearInterval(generationInterval)
    }
  }, [shouldShowParticles, particleCount, color, hoverEffect])

  const getParticleShape = (particle: Particle) => {
    const baseStyle = {
      position: 'absolute' as const,
      left: `${particle.x}px`,
      top: `${particle.y}px`,
      width: `${particle.size}px`,
      height: `${particle.size}px`,
      opacity: particle.opacity,
      transform: `rotate(${particle.rotation}deg)`,
      pointerEvents: 'none' as const,
      fontSize: `${particle.size}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'none'
    }

    switch (particle.type) {
      case 'sparkle':
        return (
          <div key={particle.id} style={baseStyle}>
            <svg 
              width={particle.size} 
              height={particle.size} 
              viewBox="0 0 24 24" 
              fill="none"
              className="magic-sparkle"
            >
              <path
                d="M12 0L14.39 8.26L24 12L14.39 15.74L12 24L9.61 15.74L0 12L9.61 8.26L12 0Z"
                fill={particle.color}
              />
            </svg>
          </div>
        )
      
      case 'heart':
        return (
          <div key={particle.id} style={baseStyle}>
            <span 
              className="floating-heart"
              style={{ 
                color: '#ff6b9d', 
                fontSize: `${particle.size * 0.8}px`
              }}
            >
              💖
            </span>
          </div>
        )
      
      case 'star':
        return (
          <div key={particle.id} style={baseStyle}>
            <span 
              className="twinkling-star"
              style={{ 
                color: '#fbbf24',
                fontSize: `${particle.size * 0.8}px`
              }}
            >
              ⭐
            </span>
          </div>
        )
      
      case 'circle':
        return (
          <div
            key={particle.id}
            style={{
              ...baseStyle,
              backgroundColor: particle.color,
              borderRadius: '50%',
              boxShadow: `0 0 ${particle.size / 2}px ${particle.color}40`,
              animation: 'cutePulse 1.5s ease-in-out infinite'
            }}
          />
        )
      
      default:
        return null
    }
  }

  if (!shouldShowParticles || particles.length === 0) {
    return hoverEffect ? (
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          width: '300px',
          height: '300px',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
    ) : null
  }

  return (
    <div 
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{
        width: '300px',
        height: '300px',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1
      }}
      onMouseEnter={hoverEffect ? () => setIsHovered(true) : undefined}
      onMouseLeave={hoverEffect ? () => setIsHovered(false) : undefined}
    >
      {particles.map(particle => getParticleShape(particle))}
    </div>
  )
}