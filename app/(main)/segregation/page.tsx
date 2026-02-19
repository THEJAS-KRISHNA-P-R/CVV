'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Zap, Camera, Square, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DetectionResult {
  category: 'Wet' | 'Dry' | 'Hazardous'
  confidence: number
  details: string
  recommendations: string[]
}

export default function SegregationPage() {
  const [cameraActive, setCameraActive] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [result, setResult] = useState<DetectionResult | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mounted, setMounted] = useState(true)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch (error) {
      alert('Camera permission denied')
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop())
    }
    setCameraActive(false)
    setResult(null)
  }

  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setDetecting(true)
    try {
      // Simulate AI detection
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockResults: DetectionResult[] = [
        {
          category: 'Wet',
          confidence: 0.92,
          details: 'Organic waste detected: food scraps, leaves',
          recommendations: [
            'Use green bin for disposal',
            'Can be composted for fertilizer',
            'Will be collected in organic waste stream',
          ],
        },
        {
          category: 'Dry',
          confidence: 0.88,
          details: 'Recyclable materials: plastic, paper, cardboard',
          recommendations: [
            'Separate by material type',
            'Recyclable in circular marketplace',
            'Clean and dry before disposal',
          ],
        },
        {
          category: 'Hazardous',
          confidence: 0.95,
          details: 'Dangerous waste: batteries, chemicals, broken glass',
          recommendations: [
            'Contact hazmat disposal team',
            'Do not mix with regular waste',
            'Store in designated containers',
          ],
        },
      ]

      setResult(mockResults[Math.floor(Math.random() * mockResults.length)])
    } finally {
      setDetecting(false)
    }
  }

  const getResultColor = (category: string) => {
    switch (category) {
      case 'Wet':
        return 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100'
      case 'Dry':
        return 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
      case 'Hazardous':
        return 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100'
      default:
        return 'bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100'
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="w-8 h-8 text-primary" />
            AI Waste Segregation
          </h1>
          <p className="text-muted-foreground mt-2">
            Use your camera to identify and segregate waste types
          </p>
        </div>

        {/* Camera Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Camera Feed
            </CardTitle>
            <CardDescription>
              Position your waste in front of the camera
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cameraActive ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full aspect-square bg-black rounded-lg object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                <div className="absolute inset-0 border-4 border-primary rounded-lg pointer-events-none animate-pulse" />
              </div>
            ) : (
              <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">Camera not active</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {!cameraActive ? (
                <Button onClick={startCamera} className="flex-1 gap-2">
                  <Camera className="w-4 h-4" />
                  Start Camera
                </Button>
              ) : (
                <>
                  <Button
                    onClick={captureAndDetect}
                    disabled={detecting}
                    className="flex-1 gap-2"
                  >
                    <Square className="w-4 h-4" />
                    {detecting ? 'Detecting...' : 'Capture & Detect'}
                  </Button>
                  <Button
                    onClick={stopCamera}
                    variant="outline"
                    className="flex-1"
                  >
                    Stop
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detection Result */}
        {result && (
          <Card className={cn(
            'border-2',
            result.category === 'Wet' ? 'border-green-300' :
            result.category === 'Dry' ? 'border-blue-300' :
            'border-red-300'
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={cn(
                  'w-3 h-3 rounded-full',
                  result.category === 'Wet' ? 'bg-green-500' :
                  result.category === 'Dry' ? 'bg-blue-500' :
                  'bg-red-500'
                )} />
                Detection Result
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'px-4 py-2 rounded-lg font-semibold',
                  getResultColor(result.category)
                )}>
                  {result.category} Waste
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-2xl font-bold">
                    {(result.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Details:</p>
                <p className="text-sm text-muted-foreground">{result.details}</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Recommendations:</p>
                <ul className="space-y-1">
                  {result.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                      <span>•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button className="w-full">Save Result</Button>
            </CardContent>
          </Card>
        )}

        {/* Information Card */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <AlertCircle className="w-5 h-5" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li>1. Click "Start Camera" to activate your device camera</li>
              <li>2. Position your waste in clear view</li>
              <li>3. Click "Capture & Detect" for AI analysis</li>
              <li>4. Review results and follow recommendations</li>
              <li>5. Earn green credits for proper segregation</li>
            </ol>
          </CardContent>
        </Card>
    </div>
  )
}
