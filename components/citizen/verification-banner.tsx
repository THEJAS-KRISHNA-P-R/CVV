'use client'

/**
 * VerificationBanner Component
 * Purpose: Display household verification status for "Anchor Handshake"
 * Features:
 *   - Shows pending/verified/rejected status
 *   - Polls for status updates
 *   - Disables signaling until verified
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  MapPin, 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  QrCode, 
  Clock, 
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HouseholdStatus {
  household_id: string
  qr_code: string
  verification_status: 'pending' | 'verified' | 'rejected'
  can_signal: boolean
  anchored_at: string | null
  anchored_by_name: string | null
  rejection_reason: string | null
  ward: number | null
  tc_address: string | null
}

interface VerificationBannerProps {
  onStatusChange?: (canSignal: boolean) => void
  className?: string
}

export function VerificationBanner({ onStatusChange, className }: VerificationBannerProps) {
  const [status, setStatus] = useState<HouseholdStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/households/status')
      const data = await response.json()
      
      if (data.success && data.data) {
        setStatus(data.data)
        onStatusChange?.(data.data.can_signal)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch status')
      }
    } catch (err) {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [onStatusChange])

  // Initial fetch
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Poll for updates when pending
  useEffect(() => {
    if (status?.verification_status === 'pending') {
      setPolling(true)
      const interval = setInterval(fetchStatus, 30000) // Poll every 30 seconds
      return () => {
        clearInterval(interval)
        setPolling(false)
      }
    }
  }, [status?.verification_status, fetchStatus])

  const handleRefresh = async () => {
    setLoading(true)
    await fetchStatus()
  }

  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  if (error || !status) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Unable to load verification status</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // No household registered
  if (!status.household_id) {
    return (
      <Card className={cn('border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800', className)}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <QrCode className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                No Household Registered
              </CardTitle>
              <CardDescription>
                Complete your registration to start using the service
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button className="w-full" asChild>
            <a href="/register">Register Your Household</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Render based on verification status
  const statusConfig = {
    pending: {
      icon: Shield,
      iconClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-100 dark:bg-amber-900',
      borderClass: 'border-amber-200 dark:border-amber-800',
      cardBgClass: 'bg-amber-50 dark:bg-amber-950/20',
      badgeVariant: 'secondary' as const,
      title: 'Location Pending Verification',
      description: 'Your HKS worker must scan your QR code during the first visit to lock your GPS coordinates.',
    },
    verified: {
      icon: ShieldCheck,
      iconClass: 'text-green-600 dark:text-green-400',
      bgClass: 'bg-green-100 dark:bg-green-900',
      borderClass: 'border-green-200 dark:border-green-800',
      cardBgClass: 'bg-green-50 dark:bg-green-950/20',
      badgeVariant: 'default' as const,
      title: 'Household Verified',
      description: `Verified by ${status.anchored_by_name || 'HKS Worker'}`,
    },
    rejected: {
      icon: ShieldX,
      iconClass: 'text-red-600 dark:text-red-400',
      bgClass: 'bg-red-100 dark:bg-red-900',
      borderClass: 'border-red-200 dark:border-red-800',
      cardBgClass: 'bg-red-50 dark:bg-red-950/20',
      badgeVariant: 'destructive' as const,
      title: 'Verification Rejected',
      description: status.rejection_reason || 'Please contact support for assistance.',
    },
  }

  const config = statusConfig[status.verification_status]
  const StatusIcon = config.icon

  return (
    <Card className={cn(config.borderClass, config.cardBgClass, className)}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', config.bgClass)}>
            <StatusIcon className={cn('w-6 h-6', config.iconClass)} />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{config.title}</CardTitle>
              <Badge variant={config.badgeVariant} className="capitalize">
                {status.verification_status}
              </Badge>
            </div>
            <CardDescription>{config.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* QR Code Display */}
        {status.qr_code && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <QrCode className="w-4 h-4" />
            <span>QR Code: <code className="font-mono bg-muted px-1 rounded">{status.qr_code}</code></span>
          </div>
        )}
        
        {/* Location Info */}
        {(status.ward || status.tc_address) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>
              {status.tc_address && <span>{status.tc_address}</span>}
              {status.ward && <span> • Ward {status.ward}</span>}
            </span>
          </div>
        )}
        
        {/* Verification Timestamp */}
        {status.anchored_at && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              Verified on {new Date(status.anchored_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </div>
        )}
        
        {/* Pending Status Actions */}
        {status.verification_status === 'pending' && (
          <div className="pt-2 space-y-3">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>What happens next?</strong>
                <ol className="list-decimal ml-4 mt-2 space-y-1">
                  <li>Wait for your HKS worker's first visit</li>
                  <li>Show them your QR code sticker on your waste bin</li>
                  <li>They will scan it to verify your location</li>
                  <li>Once verified, you can start signaling for waste collection</li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                {polling && <RefreshCw className="w-3 h-3 animate-spin" />}
                Auto-checking for updates...
              </span>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
                Check Now
              </Button>
            </div>
          </div>
        )}
        
        {/* Rejected Status Actions */}
        {status.verification_status === 'rejected' && (
          <div className="pt-2">
            <Button variant="default" className="w-full">
              Contact Support
            </Button>
          </div>
        )}
        
        {/* Signaling Status Indicator */}
        {!status.can_signal && status.verification_status !== 'verified' && (
          <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Waste Collection Signaling Disabled</p>
              <p className="text-muted-foreground">
                You cannot signal for waste collection until your household is verified.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * VerificationGuard Component
 * HOC that wraps children and disables them when not verified
 */
interface VerificationGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function VerificationGuard({ children, fallback }: VerificationGuardProps) {
  const [canSignal, setCanSignal] = useState<boolean | null>(null)
  
  if (canSignal === null) {
    // Still loading - show nothing or loading state
    return null
  }
  
  if (!canSignal) {
    return fallback || (
      <div className="relative">
        <div className="opacity-50 pointer-events-none select-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
          <div className="text-center p-4">
            <Shield className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Verification Required</p>
            <p className="text-xs text-muted-foreground">
              Your household must be verified first
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}

export default VerificationBanner
