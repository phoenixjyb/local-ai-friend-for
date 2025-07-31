import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Palette, Eraser, ArrowCounterClockwise, Share, Star, X } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface DrawingCanvasProps {
  isOpen: boolean
  onClose: () => void
  onShareDrawing: (imageData: string) => void
  personality: {
    name: string
    color: string
    emoji: string
  }
}

export default function DrawingCanvas({ isOpen, onClose, onShareDrawing, personality }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentColor, setCurrentColor] = useState('#ff6b9d')
  const [brushSize, setBrushSize] = useState(8)
  const [isErasing, setIsErasing] = useState(false)
  const [hasDrawing, setHasDrawing] = useState(false)

  // Kid-friendly color palette
  const colors = [
    '#ff6b9d', // Pink
    '#4ecdc4', // Turquoise
    '#45b7d1', // Blue
    '#96ceb4', // Mint green
    '#feca57', // Yellow
    '#ff9ff3', // Light pink
    '#54a0ff', // Light blue
    '#5f27cd', // Purple
    '#00d2d3', // Cyan
    '#ff9f43', // Orange
    '#10ac84', // Green
    '#ee5a24', // Red
  ]

  const getCoordinates = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    let clientX, clientY

    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    }
  }, [])

  const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    const { x, y } = getCoordinates(e)
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [getCoordinates])

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)

    if (isErasing) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = brushSize * 2
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = currentColor
      ctx.lineWidth = brushSize
    }

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)
    
    setHasDrawing(true)
  }, [isDrawing, currentColor, brushSize, isErasing, getCoordinates])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stopDrawing)
    canvas.addEventListener('mouseout', stopDrawing)

    // Touch events
    canvas.addEventListener('touchstart', startDrawing)
    canvas.addEventListener('touchmove', draw)
    canvas.addEventListener('touchend', stopDrawing)

    return () => {
      canvas.removeEventListener('mousedown', startDrawing)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', stopDrawing)
      canvas.removeEventListener('mouseout', stopDrawing)
      canvas.removeEventListener('touchstart', startDrawing)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', stopDrawing)
    }
  }, [startDrawing, draw, stopDrawing])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawing(false)
    toast.success('Canvas cleared! Ready for a new masterpiece!')
  }

  const shareDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawing) {
      toast.error('Draw something first!')
      return
    }

    const imageData = canvas.toDataURL('image/png')
    onShareDrawing(imageData)
    toast.success(`Sharing your beautiful art with ${personality.name}!`)
  }

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 400
    canvas.height = 500

    // Set default styles
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = currentColor
    ctx.lineWidth = brushSize

    // Fill with white background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="cute-card w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star size={24} className="text-primary magic-sparkle" />
              <h2 className="text-xl font-bold cute-bounce">Art Studio</h2>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-secondary/50"
            >
              <X size={16} />
            </Button>
          </div>

          <p className="text-muted-foreground text-center">
            Draw something amazing to show {personality.name}! {personality.emoji}
          </p>

          {/* Drawing Canvas */}
          <div className="flex justify-center">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="border-4 border-primary/30 rounded-lg shadow-lg bg-white cursor-crosshair"
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto',
                  touchAction: 'none' // Prevent scrolling while drawing
                }}
              />
              
              {/* Cute sparkle decorations around canvas */}
              <div className="absolute -top-2 -right-2 text-yellow-400 animate-pulse">✨</div>
              <div className="absolute -bottom-2 -left-2 text-pink-400 animate-bounce">💝</div>
              <div className="absolute top-1/4 -left-3 text-blue-400 animate-pulse">⭐</div>
              <div className="absolute top-3/4 -right-3 text-purple-400 animate-bounce">🌟</div>
            </div>
          </div>

          {/* Color Palette */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Palette size={16} className="text-primary" />
              <span className="text-sm font-medium">Colors</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setCurrentColor(color)
                    setIsErasing(false)
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-all cute-pulse ${
                    currentColor === color && !isErasing
                      ? 'border-foreground scale-110 shadow-lg'
                      : 'border-white hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Brush Size */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div 
                className="rounded-full bg-foreground"
                style={{ width: brushSize / 2, height: brushSize / 2 }}
              />
              <span className="text-sm font-medium">Brush Size</span>
            </div>
            <div className="flex gap-2">
              {[4, 8, 12, 16].map((size) => (
                <Button
                  key={size}
                  onClick={() => setBrushSize(size)}
                  variant={brushSize === size ? "default" : "outline"}
                  size="sm"
                  className="w-12 h-8 text-xs"
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => {
                setIsErasing(!isErasing)
                if (!isErasing) {
                  toast.info('Eraser mode on!')
                }
              }}
              variant={isErasing ? "default" : "outline"}
              className="cute-card"
            >
              <Eraser size={16} className="mr-2" />
              {isErasing ? 'Drawing' : 'Eraser'}
            </Button>
            
            <Button
              onClick={clearCanvas}
              variant="outline"
              className="cute-card border-destructive/30 hover:border-destructive/50 text-destructive"
            >
              <ArrowCounterClockwise size={16} className="mr-2" />
              Clear
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4">
            <Button
              onClick={shareDrawing}
              disabled={!hasDrawing}
              className="w-full h-12 button-text text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cute-pulse"
              style={{ 
                background: hasDrawing 
                  ? `linear-gradient(135deg, ${personality.color} 0%, ${personality.color}cc 100%)`
                  : 'linear-gradient(135deg, #ccc 0%, #aaa 100%)',
                border: '2px solid white'
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <Share size={20} />
                <span>Show {personality.name} My Art!</span>
                <div className="text-lg">{personality.emoji}</div>
              </div>
            </Button>

            {hasDrawing && (
              <Badge variant="secondary" className="w-full justify-center cute-card border-0">
                <Star size={14} className="mr-1" />
                What a beautiful creation!
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}