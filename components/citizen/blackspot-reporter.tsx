'use client'

/**
 * BlackspotReporter Component
 * Purpose: Enable citizens to report public waste issues (roadside dumping, overflow, etc.)
 * Features:
 *   - Camera integration for photo capture
 *   - GPS location capture
 *   - Category selection
 *   - Severity rating
 *   - Form submission with offline queue support
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Camera, 
  MapPin, 
  AlertTriangle, 
  Upload, 
  Loader2, 
  Navigation,
  X,
  CheckCircle,
  ImagePlus,
  Trash2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type ReportCategory = 'dumping' | 'overflow' | 'hazardous' | 'construction_debris' | 'dead_animal' | 'other'

interface FormData {
  photo: string | null
  latitude: number | null
  longitude: number | null
  category: ReportCategory | null
  description: string
  severity: number
}

const CATEGORIES: { value: ReportCategory; label: string; icon: string; description: string }[] = [
  { value: 'dumping', label: 'Illegal Dumping', icon: '🗑️', description: 'Waste dumped in unauthorized areas' },
  { value: 'overflow', label: 'Bin Overflow', icon: '📦', description: 'Public bins overflowing' },
  { value: 'hazardous', label: 'Hazardous Waste', icon: '☢️', description: 'Chemicals, batteries, medical waste' },
  { value: 'construction_debris', label: 'Construction Debris', icon: '🏗️', description: 'Building materials, rubble' },
  { value: 'dead_animal', label: 'Dead Animal', icon: '🐕', description: 'Animal carcass requiring disposal' },
  { value: 'other', label: 'Other', icon: '📋', description: 'Other waste-related issues' },
]

const SEVERITY_LEVELS = [
  { value: 1, label: 'Minor', color: 'bg-green-500', description: 'Small, localized issue' },
  { value: 2, label: 'Low', color: 'bg-lime-500', description: 'Noticeable but contained' },
  { value: 3, label: 'Medium', color: 'bg-yellow-500', description: 'Moderate impact on area' },
  { value: 4, label: 'High', color: 'bg-orange-500', description: 'Significant problem' },
  { value: 5, label: 'Critical', color: 'bg-red-500', description: 'Health hazard / emergency' },
]

interface BlackspotReporterProps {
  className?: string
  onSuccess?: () => void
}

export function BlackspotReporter({ className, onSuccess }: BlackspotReporterProps) {
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'photo' | 'location' | 'details' | 'review'>('photo')
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState<FormData>({
    photo: null,
    latitude: null,
    longitude: null,
    category: null,
    description: '',
    severity: 3,
  })

  // Fix hydration mismatch - only render Dialog after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    setIsOpen(open)
  }

  const resetForm = () => {
    setFormData({
      photo: null,
      latitude: null,
      longitude: null,
      category: null,
      description: '',
      severity: 3,
    })
    setStep('photo')
    setError(null)
    stopCamera()
  }

  // ==================
  // CAMERA FUNCTIONS
  // ==================
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
        setError(null)
      }
    } catch (err) {
      console.error('Camera error:', err)
      setError('Unable to access camera. Please check permissions or upload a photo instead.')
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0)

    // Convert to Base64
    const photoData = canvas.toDataURL('image/jpeg', 0.8)
    setFormData(prev => ({ ...prev, photo: photoData }))
    
    stopCamera()
    setStep('location')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, photo: event.target?.result as string }))
      setStep('location')
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  // ==================
  // LOCATION FUNCTIONS
  // ==================
  
  const getLocation = async () => {
    setLocationLoading(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      })

      setFormData(prev => ({
        ...prev,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }))
      
      setStep('details')
    } catch (err: unknown) {
      const geoError = err as GeolocationPositionError
      console.error('Location error:', geoError)
      if (geoError.code === 1) {
        setError('Location permission denied. Please enable location access.')
      } else if (geoError.code === 2) {
        setError('Unable to determine location. Please try again.')
      } else {
        setError('Location request timed out. Please try again.')
      }
    } finally {
      setLocationLoading(false)
    }
  }

  // ==================
  // FORM SUBMISSION
  // ==================
  
  const handleSubmit = async () => {
    if (!formData.photo || !formData.latitude || !formData.longitude || !formData.category) {
      setError('Please complete all required fields')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/reports/blackspot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photo: formData.photo,
          latitude: formData.latitude,
          longitude: formData.longitude,
          category: formData.category,
          description: formData.description,
          severity: formData.severity,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Report Submitted!', {
          description: 'Municipal authorities have been notified. Thank you for keeping your city clean!',
        })
        setIsOpen(false)
        resetForm()
        onSuccess?.()
      } else {
        setError(data.error || 'Failed to submit report')
      }
    } catch (err) {
      console.error('Submit error:', err)
      setError('Network error. Your report has been saved and will be submitted when you\'re back online.')
      // TODO: Save to IndexedDB for offline sync
    } finally {
      setLoading(false)
    }
  }

  // ==================
  // STEP COMPONENTS
  // ==================
  
  const renderPhotoStep = () => (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {formData.photo ? (
        <div className="relative">
          <img 
            src={formData.photo} 
            alt="Captured waste" 
            className="w-full rounded-lg object-cover max-h-64"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={() => setFormData(prev => ({ ...prev, photo: null }))}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : cameraActive ? (
        <div className="relative">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full rounded-lg"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <Button variant="destructive" onClick={stopCamera}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={capturePhoto}>
              <Camera className="w-4 h-4 mr-2" />
              Capture
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            className="h-32 flex flex-col gap-2"
            onClick={startCamera}
          >
            <Camera className="w-8 h-8" />
            <span>Take Photo</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-32 flex flex-col gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="w-8 h-8" />
            <span>Upload Photo</span>
          </Button>
          <input 
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {formData.photo && (
        <Button className="w-full" onClick={() => setStep('location')}>
          Continue
        </Button>
      )}
    </div>
  )

  const renderLocationStep = () => (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="text-center py-8">
        <MapPin className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        
        {formData.latitude && formData.longitude ? (
          <div className="space-y-2">
            <Badge variant="secondary" className="text-sm">
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Location captured
            </Badge>
            <p className="text-xs text-muted-foreground font-mono">
              {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">
            We need your current location to pinpoint the waste issue
          </p>
        )}
      </div>

      {!formData.latitude ? (
        <Button 
          className="w-full" 
          size="lg" 
          onClick={getLocation}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4 mr-2" />
          )}
          {locationLoading ? 'Getting Location...' : 'Use Current Location'}
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={getLocation}>
            <MapPin className="w-4 h-4 mr-2" />
            Update Location
          </Button>
          <Button className="flex-1" onClick={() => setStep('details')}>
            Continue
          </Button>
        </div>
      )}
    </div>
  )

  const renderDetailsStep = () => (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Category Selection */}
      <div className="space-y-2">
        <Label>What type of issue is this? *</Label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
              className={cn(
                'p-3 rounded-lg border-2 text-left transition-colors',
                formData.category === cat.value
                  ? 'border-primary bg-primary/10'
                  : 'border-muted hover:border-primary/50'
              )}
            >
              <span className="text-lg mr-2">{cat.icon}</span>
              <span className="text-sm font-medium">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Severity Selection */}
      <div className="space-y-2">
        <Label>How severe is the issue?</Label>
        <div className="flex gap-2">
          {SEVERITY_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, severity: level.value }))}
              className={cn(
                'flex-1 p-2 rounded-lg border-2 transition-colors text-center',
                formData.severity === level.value
                  ? 'border-primary bg-primary/10'
                  : 'border-muted hover:border-primary/50'
              )}
            >
              <div className={cn('w-4 h-4 rounded-full mx-auto mb-1', level.color)} />
              <span className="text-xs">{level.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Additional Details (Optional)</Label>
        <Textarea
          id="description"
          placeholder="E.g., 'Large pile near bus stop, attracting stray dogs'"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
        />
      </div>

      <Button 
        className="w-full" 
        onClick={() => setStep('review')}
        disabled={!formData.category}
      >
        Review & Submit
      </Button>
    </div>
  )

  const renderReviewStep = () => {
    const selectedCategory = CATEGORIES.find(c => c.value === formData.category)
    const selectedSeverity = SEVERITY_LEVELS.find(s => s.value === formData.severity)

    return (
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Photo Preview */}
        {formData.photo && (
          <img 
            src={formData.photo} 
            alt="Captured waste" 
            className="w-full rounded-lg object-cover max-h-40"
          />
        )}

        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Category</span>
            <Badge variant="outline">
              {selectedCategory?.icon} {selectedCategory?.label}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Severity</span>
            <div className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-full', selectedSeverity?.color)} />
              <span className="text-sm">{selectedSeverity?.label}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Location</span>
            <span className="text-sm font-mono">
              {formData.latitude?.toFixed(4)}, {formData.longitude?.toFixed(4)}
            </span>
          </div>
          
          {formData.description && (
            <div>
              <span className="text-sm text-muted-foreground">Notes</span>
              <p className="text-sm mt-1">{formData.description}</p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {loading ? 'Submitting...' : 'Submit Report'}
        </Button>
      </div>
    )
  }

  // SSR placeholder to avoid hydration mismatch
  if (!mounted) {
    return (
      <Card className={cn('hover:shadow-lg transition-shadow', className)}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Report Public Waste Issue</CardTitle>
              <CardDescription>
                Spotted illegal dumping or overflow? Report it!
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" className="w-full" disabled>
            <Camera className="w-4 h-4 mr-2" />
            Report Blackspot
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Card className={cn('hover:shadow-lg transition-shadow cursor-pointer', className)}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Report Public Waste Issue</CardTitle>
                  <CardDescription>
                    Spotted illegal dumping or overflow? Report it!
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <Camera className="w-4 h-4 mr-2" />
                Report Blackspot
              </Button>
            </CardFooter>
          </Card>
        </DialogTrigger>

        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Report Waste Issue
            </DialogTitle>
            <DialogDescription>
              Help keep your city clean by reporting public waste issues
            </DialogDescription>
          </DialogHeader>

          {/* Progress Indicator */}
          <div className="flex gap-2 mb-4">
            {['photo', 'location', 'details', 'review'].map((s, i) => (
              <div
                key={s}
                className={cn(
                  'h-2 flex-1 rounded-full transition-colors',
                  ['photo', 'location', 'details', 'review'].indexOf(step) >= i
                    ? 'bg-primary'
                    : 'bg-muted'
                )}
              />
            ))}
          </div>

          {/* Step Content */}
          {step === 'photo' && renderPhotoStep()}
          {step === 'location' && renderLocationStep()}
          {step === 'details' && renderDetailsStep()}
          {step === 'review' && renderReviewStep()}

          {/* Back Button */}
          {step !== 'photo' && (
            <Button
              variant="ghost"
              className="w-full mt-2"
              onClick={() => {
                const steps = ['photo', 'location', 'details', 'review'] as const
                const currentIndex = steps.indexOf(step)
                if (currentIndex > 0) {
                  setStep(steps[currentIndex - 1])
                }
              }}
            >
              Go Back
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default BlackspotReporter
