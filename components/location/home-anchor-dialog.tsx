'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { 
  MapPin, 
  Home, 
  Loader2, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Anchor,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LocationPicker, type Coordinates } from './location-picker'
import { AddressForm, type AddressFormData, WardInfoCard } from './address-form'
import { toast } from 'sonner'

interface HomeAnchorDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  trigger?: React.ReactNode
  editMode?: boolean
  initialData?: {
    coordinates: Coordinates
    address: Partial<AddressFormData>
  }
  className?: string
}

export function HomeAnchorDialog({
  open,
  onOpenChange,
  onSuccess,
  trigger,
  editMode = false,
  initialData,
  className,
}: HomeAnchorDialogProps) {
  const [isOpen, setIsOpen] = useState(open || false)
  const [step, setStep] = useState<'location' | 'details'>('location')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Form state
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    initialData?.coordinates || null
  )
  const [geocodedAddress, setGeocodedAddress] = useState('')
  const [addressData, setAddressData] = useState<AddressFormData>({
    nickname: initialData?.address?.nickname || 'My House',
    manualAddress: initialData?.address?.manualAddress || '',
    geocodedAddress: initialData?.address?.geocodedAddress || '',
    wardNumber: initialData?.address?.wardNumber || null,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync with external open state
  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open)
    }
  }, [open])

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
    
    // Reset form when closing
    if (!newOpen && !editMode) {
      setStep('location')
      setCoordinates(null)
      setGeocodedAddress('')
      setAddressData({
        nickname: 'My House',
        manualAddress: '',
        geocodedAddress: '',
        wardNumber: null,
      })
    }
  }, [onOpenChange, editMode])

  const handleLocationChange = useCallback((coords: Coordinates) => {
    setCoordinates(coords)
  }, [])

  const handleAddressFromGeocode = useCallback((address: string) => {
    setGeocodedAddress(address)
    setAddressData(prev => ({ ...prev, geocodedAddress: address }))
  }, [])

  const handleAddressChange = useCallback((data: AddressFormData) => {
    setAddressData(data)
  }, [])

  const handleSubmit = async () => {
    if (!coordinates) {
      toast.error('Please select a location on the map')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/households/establish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: coordinates.lat,
          lng: coordinates.lng,
          nickname: addressData.nickname,
          manualAddress: addressData.manualAddress,
          geocodedAddress: addressData.geocodedAddress,
          wardNumber: addressData.wardNumber,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save location')
      }

      toast.success(
        result.data.created 
          ? 'Home location anchored successfully!' 
          : 'Location updated successfully!'
      )

      handleOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error saving location:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save location')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceedToDetails = !!coordinates
  const canSubmit = !!coordinates && addressData.nickname.trim().length > 0

  // SSR placeholder
  if (!mounted) {
    return trigger || (
      <Button className="w-full bg-green-600 hover:bg-green-700">
        <MapPin className="w-4 h-4 mr-2" />
        Anchor My House
      </Button>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      
      <DialogContent className={cn('max-w-2xl max-h-[90vh] overflow-y-auto p-0', className)}>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Anchor className="w-5 h-5 text-green-600" />
            {editMode ? 'Update Your Location' : 'Anchor Your Home'}
          </DialogTitle>
          <DialogDescription>
            {editMode 
              ? 'Update your home location and address details' 
              : 'Drop a pin on your exact doorstep for waste collection services'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm',
                step === 'location' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-green-100 text-green-600 dark:bg-green-900'
              )}>
                {step !== 'location' ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className={cn(
                'text-sm font-medium',
                step === 'location' ? 'text-foreground' : 'text-muted-foreground'
              )}>
                Pin Location
              </span>
            </div>
            
            <div className="flex-1 h-0.5 bg-muted">
              <div className={cn(
                'h-full bg-green-600 transition-all',
                step === 'details' ? 'w-full' : 'w-0'
              )} />
            </div>
            
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm',
                step === 'details' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-muted text-muted-foreground'
              )}>
                2
              </div>
              <span className={cn(
                'text-sm font-medium',
                step === 'details' ? 'text-foreground' : 'text-muted-foreground'
              )}>
                Add Details
              </span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {step === 'location' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Click on the map or drag the pin to your exact doorstep location
                </p>
              </div>

              <LocationPicker
                value={coordinates}
                onChange={handleLocationChange}
                onAddressChange={handleAddressFromGeocode}
                height="350px"
              />

              {coordinates && (
                <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        Location Selected
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button 
                  onClick={() => setStep('details')}
                  disabled={!canProceedToDetails}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              <AddressForm
                geocodedAddress={geocodedAddress}
                value={addressData}
                onChange={handleAddressChange}
              />

              {addressData.wardNumber && (
                <WardInfoCard wardNumber={addressData.wardNumber} />
              )}

              <div className="flex justify-between gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('location')}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                
                <Button 
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="bg-green-600 hover:bg-green-700 flex-1 max-w-[200px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {editMode ? 'Update Location' : 'Anchor My House'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 pb-6">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">
              Your location is used for waste collection routing. 
              You can update it anytime from your dashboard.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Full page version for dedicated setup flow
export function HomeAnchorPage({
  onSuccess,
}: {
  onSuccess?: () => void
}) {
  const [step, setStep] = useState<'location' | 'details'>('location')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [geocodedAddress, setGeocodedAddress] = useState('')
  const [addressData, setAddressData] = useState<AddressFormData>({
    nickname: 'My House',
    manualAddress: '',
    geocodedAddress: '',
    wardNumber: null,
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async () => {
    if (!coordinates) {
      toast.error('Please select a location on the map')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/households/establish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: coordinates.lat,
          lng: coordinates.lng,
          nickname: addressData.nickname,
          manualAddress: addressData.manualAddress,
          geocodedAddress: addressData.geocodedAddress,
          wardNumber: addressData.wardNumber,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save location')
      }

      toast.success('Home location anchored successfully!')
      onSuccess?.()
    } catch (error) {
      console.error('Error saving location:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save location')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950 dark:to-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <Anchor className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Anchor Your Home</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Set your exact location for waste collection. This takes less than 30 seconds!
          </p>
        </div>

        {/* Step Tabs */}
        <Tabs value={step} onValueChange={(v) => setStep(v as typeof step)}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="location" className="gap-2">
              <MapPin className="w-4 h-4" />
              Pin Location
            </TabsTrigger>
            <TabsTrigger 
              value="details" 
              disabled={!coordinates}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Add Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="location" className="space-y-4">
            <LocationPicker
              value={coordinates}
              onChange={setCoordinates}
              onAddressChange={(addr: string) => {
                setGeocodedAddress(addr)
                setAddressData(prev => ({ ...prev, geocodedAddress: addr }))
              }}
              height="450px"
            />

            {coordinates && (
              <div className="flex justify-end">
                <Button 
                  onClick={() => setStep('details')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <AddressForm
              geocodedAddress={geocodedAddress}
              value={addressData}
              onChange={setAddressData}
            />

            {addressData.wardNumber && (
              <WardInfoCard wardNumber={addressData.wardNumber} />
            )}

            <div className="flex justify-between gap-4">
              <Button 
                variant="outline" 
                onClick={() => setStep('location')}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              <Button 
                onClick={handleSubmit}
                disabled={!coordinates || isSubmitting}
                className="bg-green-600 hover:bg-green-700 flex-1 max-w-[200px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Anchor My House
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
