import { useEffect, useRef, useState } from 'react'

interface AudioVisualizationProps {
  isListening: boolean
  color?: string
  size?: 'small' | 'medium' | 'large'
  type?: 'wave' | 'bars' | 'circle' | 'pulse'
}

export default function AudioVisualization({ 
  isListening, 
  color = '#3b82f6',
  size = 'medium',
  type = 'wave'
}: AudioVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(128))
  const [volumeLevel, setVolumeLevel] = useState(0)

  // Convert oklch/oklch color to hex for canvas compatibility
  const getCanvasCompatibleColor = (inputColor: string): string => {
    if (inputColor.startsWith('#')) {
      return inputColor
    }
    
    // For oklch colors, convert to a compatible hex color
    if (inputColor.startsWith('oklch(')) {
      // Extract the lightness and chroma values to create a similar hex color
      const oklchMatch = inputColor.match(/oklch\(([^)]+)\)/)
      if (oklchMatch) {
        const values = oklchMatch[1].split(/\s+/)
        const lightness = parseFloat(values[0])
        const chroma = parseFloat(values[1] || '0')
        const hue = parseFloat(values[2] || '0')
        
        // Convert to a rough RGB approximation
        // This is a simplified conversion - for exact conversion you'd need a color library
        const rgbValue = Math.round(lightness * 255)
        const chromaBoost = Math.round(chroma * 100)
        
        // Ensure values are within 0-255 range and convert to proper hex
        const clamp = (val: number) => Math.max(0, Math.min(255, val))
        const toHex = (val: number) => clamp(val).toString(16).padStart(2, '0')
        
        if (hue >= 0 && hue < 60) {
          // Red-orange range
          return `#${toHex(rgbValue + chromaBoost)}${toHex(rgbValue - chromaBoost / 2)}${toHex(rgbValue - chromaBoost)}`
        } else if (hue >= 60 && hue < 180) {
          // Yellow-green range
          return `#${toHex(rgbValue - chromaBoost / 2)}${toHex(rgbValue + chromaBoost)}${toHex(rgbValue - chromaBoost)}`
        } else if (hue >= 180 && hue < 300) {
          // Blue-purple range
          return `#${toHex(rgbValue - chromaBoost)}${toHex(rgbValue - chromaBoost / 2)}${toHex(rgbValue + chromaBoost)}`
        } else {
          // Purple-red range
          return `#${toHex(rgbValue + chromaBoost / 2)}${toHex(rgbValue - chromaBoost)}${toHex(rgbValue + chromaBoost / 2)}`
        }
      }
    }
    
    // Fallback to blue
    return '#3b82f6'
  }

  const canvasColor = getCanvasCompatibleColor(color)

  // Size configurations
  const sizeConfig = {
    small: { width: 120, height: 60, lineWidth: 2 },
    medium: { width: 200, height: 80, lineWidth: 3 },
    large: { width: 300, height: 120, lineWidth: 4 }
  }

  const config = sizeConfig[size]

  // Initialize audio context and microphone access
  useEffect(() => {
    if (!isListening) {
      cleanupAudio()
      return
    }

    const initializeAudio = async () => {
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        })
        streamRef.current = stream

        // Create audio context with proper error handling
        try {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
          
          // Resume context if suspended (required by autoplay policy)
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume()
          }
        } catch (audioError) {
          console.warn('Failed to create AudioContext for visualization:', audioError)
          return // Exit early if AudioContext creation fails
        }
        
        // Create analyser node
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 256
        analyserRef.current.smoothingTimeConstant = 0.8

        // Connect microphone to analyser
        microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream)
        microphoneRef.current.connect(analyserRef.current)

        // Start visualization
        startVisualization()
      } catch (error) {
        console.error('Error accessing microphone for visualization:', error)
      }
    }

    initializeAudio()

    return () => {
      cleanupAudio()
    }
  }, [isListening])

  const cleanupAudio = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (microphoneRef.current) {
      microphoneRef.current.disconnect()
      microphoneRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    analyserRef.current = null
    setAudioData(new Uint8Array(128))
    setVolumeLevel(0)
  }

  const startVisualization = () => {
    if (!analyserRef.current) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const animate = () => {
      if (!analyserRef.current || !isListening) return

      analyserRef.current.getByteFrequencyData(dataArray)
      
      // Calculate volume level (0-100)
      const sum = dataArray.reduce((a, b) => a + b, 0)
      const average = sum / dataArray.length
      const volume = Math.min(100, (average / 255) * 100)
      
      setAudioData(new Uint8Array(dataArray))
      setVolumeLevel(volume)

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()
  }

  // Draw visualization on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height, lineWidth } = config
    canvas.width = width
    canvas.height = height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    if (!isListening) {
      // Draw idle state
      drawIdleState(ctx, width, height, canvasColor)
      return
    }

    // Draw based on type
    switch (type) {
      case 'wave':
        drawWaveform(ctx, width, height, audioData, canvasColor, lineWidth, volumeLevel)
        break
      case 'bars':
        drawBars(ctx, width, height, audioData, canvasColor, volumeLevel)
        break
      case 'circle':
        drawCircle(ctx, width, height, audioData, canvasColor, lineWidth, volumeLevel)
        break
      case 'pulse':
        drawPulse(ctx, width, height, volumeLevel, canvasColor)
        break
    }
  }, [audioData, isListening, canvasColor, type, config, volumeLevel])

  const drawIdleState = (ctx: CanvasRenderingContext2D, width: number, height: number, color: string) => {
    // Convert color to rgba for transparency - improved error handling
    const getColorWithAlpha = (baseColor: string, alpha: number) => {
      try {
        if (baseColor.startsWith('#') && baseColor.length === 7) {
          const r = parseInt(baseColor.slice(1, 3), 16)
          const g = parseInt(baseColor.slice(3, 5), 16)
          const b = parseInt(baseColor.slice(5, 7), 16)
          
          // Validate RGB values
          if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            return `rgba(${r}, ${g}, ${b}, ${alpha})`
          }
        }
      } catch (error) {
        console.warn('Invalid color format:', baseColor, error)
      }
      // Safe fallback
      return `rgba(59, 130, 246, ${alpha})` // fallback blue
    }

    ctx.strokeStyle = getColorWithAlpha(color, 0.25)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'

    // Draw a gentle flat line with subtle animation
    const time = Date.now() * 0.001
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    
    for (let x = 0; x < width; x++) {
      const y = height / 2 + Math.sin(x * 0.02 + time) * 2
      ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Add microphone icon indicator with ready state
    ctx.fillStyle = getColorWithAlpha(color, 0.5)
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('🎤', width / 2, height / 2 + 5)
    
    // Add "Ready" text
    ctx.fillStyle = getColorWithAlpha(color, 0.4)
    ctx.font = '10px Arial'
    ctx.fillText('Ready', width / 2, height / 2 + 20)
  }

  const drawWaveform = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    data: Uint8Array, 
    color: string, 
    lineWidth: number,
    volume: number
  ) => {
    // Convert color to rgba for transparency - improved error handling
    const getColorWithAlpha = (baseColor: string, alpha: number) => {
      try {
        if (baseColor.startsWith('#') && baseColor.length === 7) {
          const r = parseInt(baseColor.slice(1, 3), 16)
          const g = parseInt(baseColor.slice(3, 5), 16)
          const b = parseInt(baseColor.slice(5, 7), 16)
          
          // Validate RGB values
          if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            return `rgba(${r}, ${g}, ${b}, ${alpha})`
          }
        }
      } catch (error) {
        console.warn('Invalid color format:', baseColor, error)
      }
      // Safe fallback
      return `rgba(59, 130, 246, ${alpha})` // fallback blue
    }

    const gradient = ctx.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, getColorWithAlpha(color, 0.5))
    gradient.addColorStop(0.5, color)
    gradient.addColorStop(1, getColorWithAlpha(color, 0.5))
    
    ctx.strokeStyle = gradient
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Draw main waveform
    ctx.beginPath()
    ctx.moveTo(0, height / 2)

    const sliceWidth = width / data.length
    let x = 0

    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 255.0
      const y = (v * height / 2) + (height / 4)
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
      
      x += sliceWidth
    }
    
    ctx.stroke()

    // Add glow effect for high volume
    if (volume > 30) {
      ctx.shadowColor = color
      ctx.shadowBlur = 10 + (volume / 10)
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    // Add volume indicator
    drawVolumeIndicator(ctx, width, height, volume, color)
  }

  const drawBars = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    data: Uint8Array, 
    color: string,
    volume: number
  ) => {
    // Convert color to rgba for transparency - improved error handling
    const getColorWithAlpha = (baseColor: string, alpha: number) => {
      try {
        if (baseColor.startsWith('#') && baseColor.length === 7) {
          const r = parseInt(baseColor.slice(1, 3), 16)
          const g = parseInt(baseColor.slice(3, 5), 16)
          const b = parseInt(baseColor.slice(5, 7), 16)
          
          // Validate RGB values
          if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            return `rgba(${r}, ${g}, ${b}, ${alpha})`
          }
        }
      } catch (error) {
        console.warn('Invalid color format:', baseColor, error)
      }
      // Safe fallback
      return `rgba(59, 130, 246, ${alpha})` // fallback blue
    }

    const barCount = Math.min(32, data.length)
    const barWidth = width / barCount
    const spacing = 2

    for (let i = 0; i < barCount; i++) {
      const barHeight = (data[i] / 255) * height
      const x = i * barWidth
      
      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight)
      gradient.addColorStop(0, getColorWithAlpha(color, 0.25))
      gradient.addColorStop(0.5, getColorWithAlpha(color, 0.5))
      gradient.addColorStop(1, color)
      
      ctx.fillStyle = gradient
      ctx.fillRect(x + spacing/2, height - barHeight, barWidth - spacing, barHeight)
      
      // Add glow for active bars
      if (barHeight > height * 0.1) {
        ctx.shadowColor = color
        ctx.shadowBlur = 5
        ctx.fillRect(x + spacing/2, height - barHeight, barWidth - spacing, barHeight)
        ctx.shadowBlur = 0
      }
    }

    drawVolumeIndicator(ctx, width, height, volume, color)
  }

  const drawCircle = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    data: Uint8Array, 
    color: string, 
    lineWidth: number,
    volume: number
  ) => {
    const centerX = width / 2
    const centerY = height / 2
    const baseRadius = Math.min(width, height) / 4
    
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'

    // Draw multiple concentric circles based on frequency data
    const circles = 3
    for (let circle = 0; circle < circles; circle++) {
      ctx.beginPath()
      const radiusMultiplier = 1 + (circle * 0.3)
      
      for (let i = 0; i < data.length; i++) {
        const angle = (i / data.length) * Math.PI * 2
        const amplitude = (data[i] / 255) * 20 * radiusMultiplier
        const radius = baseRadius * radiusMultiplier + amplitude
        
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      
      ctx.closePath()
      ctx.globalAlpha = 0.8 - (circle * 0.2)
      ctx.stroke()
    }
    
    ctx.globalAlpha = 1

    // Add center pulse
    const pulseRadius = baseRadius * 0.3 + (volume / 100) * 10
    ctx.beginPath()
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2)
    
    // Convert color to rgba for transparency - improved error handling
    const getColorWithAlpha = (baseColor: string, alpha: number) => {
      try {
        if (baseColor.startsWith('#') && baseColor.length === 7) {
          const r = parseInt(baseColor.slice(1, 3), 16)
          const g = parseInt(baseColor.slice(3, 5), 16)
          const b = parseInt(baseColor.slice(5, 7), 16)
          
          // Validate RGB values
          if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            return `rgba(${r}, ${g}, ${b}, ${alpha})`
          }
        }
      } catch (error) {
        console.warn('Invalid color format:', baseColor, error)
      }
      // Safe fallback
      return `rgba(59, 130, 246, ${alpha})` // fallback blue
    }
    
    ctx.fillStyle = getColorWithAlpha(canvasColor, 0.25)
    ctx.fill()
  }

  const drawPulse = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    volume: number, 
    color: string
  ) => {
    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) / 2 - 10
    
    // Convert color to rgba for transparency - improved error handling
    const getColorWithAlpha = (baseColor: string, alpha: number) => {
      try {
        if (baseColor.startsWith('#') && baseColor.length === 7) {
          const r = parseInt(baseColor.slice(1, 3), 16)
          const g = parseInt(baseColor.slice(3, 5), 16)
          const b = parseInt(baseColor.slice(5, 7), 16)
          
          // Validate RGB values
          if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            return `rgba(${r}, ${g}, ${b}, ${alpha})`
          }
        }
      } catch (error) {
        console.warn('Invalid color format:', baseColor, error)
      }
      // Safe fallback
      return `rgba(59, 130, 246, ${alpha})` // fallback blue
    }
    
    // Draw multiple pulse rings
    const rings = 5
    const time = Date.now() * 0.005
    
    for (let i = 0; i < rings; i++) {
      const progress = (time + i * 0.2) % 1
      const radius = (volume / 100) * maxRadius * progress
      const opacity = (1 - progress) * 0.8
      
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.strokeStyle = getColorWithAlpha(color, opacity)
      ctx.lineWidth = 3
      ctx.stroke()
    }

    // Central core
    const coreRadius = (volume / 100) * 15 + 5
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, getColorWithAlpha(color, 0.25))
    
    ctx.beginPath()
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()
  }

  const drawVolumeIndicator = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    volume: number, 
    color: string
  ) => {
    // Convert color to rgba for transparency - improved error handling
    const getColorWithAlpha = (baseColor: string, alpha: number) => {
      try {
        if (baseColor.startsWith('#') && baseColor.length === 7) {
          const r = parseInt(baseColor.slice(1, 3), 16)
          const g = parseInt(baseColor.slice(3, 5), 16)
          const b = parseInt(baseColor.slice(5, 7), 16)
          
          // Validate RGB values
          if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            return `rgba(${r}, ${g}, ${b}, ${alpha})`
          }
        }
      } catch (error) {
        console.warn('Invalid color format:', baseColor, error)
      }
      // Safe fallback
      return `rgba(59, 130, 246, ${alpha})` // fallback blue
    }

    // Volume level indicator
    const indicatorWidth = 4
    const indicatorHeight = height * 0.8
    const x = width - 15
    const y = (height - indicatorHeight) / 2
    
    // Background
    ctx.fillStyle = getColorWithAlpha(color, 0.125)
    ctx.fillRect(x, y, indicatorWidth, indicatorHeight)
    
    // Active volume
    const activeHeight = (volume / 100) * indicatorHeight
    const gradient = ctx.createLinearGradient(0, y + indicatorHeight, 0, y)
    gradient.addColorStop(0, '#10b981') // Green for low
    gradient.addColorStop(0.7, '#f59e0b') // Yellow for medium
    gradient.addColorStop(1, '#ef4444') // Red for high
    
    ctx.fillStyle = gradient
    ctx.fillRect(x, y + indicatorHeight - activeHeight, indicatorWidth, activeHeight)
  }

  return (
    <div className={`audio-visualization ${isListening ? 'active' : 'idle'}`}>
      <canvas
        ref={canvasRef}
        className={`rounded-lg bg-black/5 backdrop-blur-sm border-2 transition-all duration-300 ${
          isListening 
            ? 'border-blue-300 shadow-lg shadow-blue-200/50' 
            : 'border-gray-200 shadow-sm'
        }`}
        style={{
          filter: isListening && volumeLevel > 10 
            ? `drop-shadow(0 0 ${Math.min(20, volumeLevel / 2)}px ${canvasColor}60)` 
            : 'none'
        }}
      />
      
      {/* Volume level text indicator with enhanced feedback */}
      {isListening && (
        <div className="text-xs text-center mt-2 font-medium transition-all duration-300">
          {volumeLevel > 15 ? (
            <span className="animate-pulse text-green-600 font-bold">
              🎤 Sound Detected! Volume: {Math.round(volumeLevel)}%
            </span>
          ) : volumeLevel > 5 ? (
            <span className="text-blue-600">
              🎤 Quiet sound: {Math.round(volumeLevel)}%
            </span>
          ) : (
            <span className="text-gray-500 animate-pulse">
              🎤 Listening... Speak up!
            </span>
          )}
        </div>
      )}
      
      {!isListening && (
        <div className="text-xs text-center mt-2 text-gray-400 font-medium">
          🎤 Microphone ready
        </div>
      )}
    </div>
  )
}