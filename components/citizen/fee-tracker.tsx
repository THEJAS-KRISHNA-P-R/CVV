'use client'

/**
 * FeeTracker Component
 * Purpose: Display municipal fee status and payment history
 * Features:
 *   - Current month dues
 *   - Payment history
 *   - Outstanding balance
 *   - Payment CTA (placeholder for future gateway integration)
 * Aligned with: SUCHITWA Mission (₹50/month household waste collection fee)
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  AlertTriangle,
  Receipt,
  IndianRupee,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  History
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'waived'

interface PaymentRecord {
  id: string
  month: number
  year: number
  amount: number
  status: PaymentStatus
  paid_at: string | null
  payment_method: string | null
  transaction_ref: string | null
}

interface PaymentData {
  household_id: string
  current_month: {
    month: number
    year: number
    month_name: string
    amount: number
    status: PaymentStatus
    due_date: string
  }
  summary: {
    total_pending: number
    total_overdue: number
    total_paid_this_year: number
    last_payment_date: string | null
  }
  history: PaymentRecord[]
}

interface FeeTrackerProps {
  className?: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const STATUS_CONFIG = {
  paid: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900',
    badgeVariant: 'default' as const,
    label: 'PAID',
  },
  pending: {
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
    badgeVariant: 'secondary' as const,
    label: 'PENDING',
  },
  overdue: {
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900',
    badgeVariant: 'destructive' as const,
    label: 'OVERDUE',
  },
  waived: {
    icon: Receipt,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    badgeVariant: 'outline' as const,
    label: 'WAIVED',
  },
}

export function FeeTracker({ className }: FeeTrackerProps) {
  const [data, setData] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const fetchPaymentStatus = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/payments/status')
      const result = await response.json()

      if (result.success && result.data) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch payment status')
      }
    } catch (err) {
      console.error('Payment fetch error:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPaymentStatus()
  }, [])

  const handlePayNow = () => {
    toast.info('Payment Integration Coming Soon', {
      description: 'Please pay your HKS worker directly during collection. Digital payments will be enabled soon.',
      duration: 5000,
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
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
        <CardContent>
          <div className="h-24 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5" />
            Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={fetchPaymentStatus}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5" />
            Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No payment data available. Register a household to view fees.
          </p>
        </CardContent>
      </Card>
    )
  }

  const currentStatus = STATUS_CONFIG[data.current_month.status]
  const StatusIcon = currentStatus.icon
  const hasOutstanding = data.summary.total_pending > 0 || data.summary.total_overdue > 0

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', currentStatus.bgColor)}>
              <IndianRupee className={cn('w-6 h-6', currentStatus.color)} />
            </div>
            <div>
              <CardTitle className="text-lg">Municipal Fees</CardTitle>
              <CardDescription>SUCHITWA Mission Waste Collection</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchPaymentStatus}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Month Status */}
        <div className={cn(
          'rounded-lg p-4 border-2',
          data.current_month.status === 'paid' 
            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
            : data.current_month.status === 'overdue'
            ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
            : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {data.current_month.month_name} {data.current_month.year}
            </span>
            <Badge variant={currentStatus.badgeVariant}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {currentStatus.label}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold">
              {formatCurrency(data.current_month.amount)}
            </span>
            {data.current_month.status !== 'paid' && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Due by</p>
                <p className="text-sm font-medium">
                  {formatDate(data.current_month.due_date)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Outstanding Alert */}
        {hasOutstanding && (
          <Alert variant={data.summary.total_overdue > 0 ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Outstanding Balance: </strong>
              {formatCurrency(data.summary.total_pending + data.summary.total_overdue)}
              {data.summary.total_overdue > 0 && (
                <span className="text-red-600 ml-2">
                  ({formatCurrency(data.summary.total_overdue)} overdue)
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(data.summary.total_paid_this_year)}
            </p>
            <p className="text-xs text-muted-foreground">Paid This Year</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">
              {data.summary.last_payment_date 
                ? formatDate(data.summary.last_payment_date)
                : 'No payments yet'}
            </p>
            <p className="text-xs text-muted-foreground">Last Payment</p>
          </div>
        </div>

        <Separator />

        {/* Payment History */}
        <div>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between"
            onClick={() => setShowHistory(!showHistory)}
          >
            <span className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Payment History
            </span>
            {showHistory ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>

          {showHistory && (
            <div className="mt-4 space-y-2">
              {data.history.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  No payment history available
                </p>
              ) : (
                data.history.map((payment) => {
                  const config = STATUS_CONFIG[payment.status]
                  const PaymentIcon = config.icon

                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', config.bgColor)}>
                          <PaymentIcon className={cn('w-4 h-4', config.color)} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {MONTH_NAMES[payment.month - 1]} {payment.year}
                          </p>
                          {payment.paid_at && (
                            <p className="text-xs text-muted-foreground">
                              Paid on {formatDate(payment.paid_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                        <Badge variant={config.badgeVariant} className="text-xs">
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex-col gap-3">
        {data.current_month.status !== 'paid' && (
          <Button className="w-full" size="lg" onClick={handlePayNow}>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay Now - {formatCurrency(data.current_month.amount)}
          </Button>
        )}
        
        <p className="text-xs text-center text-muted-foreground">
          Payment integration coming soon. Pay your HKS worker directly during collection.
        </p>
      </CardFooter>
    </Card>
  )
}

/**
 * FeeTrackerCompact Component
 * Smaller version for dashboard overview
 */
export function FeeTrackerCompact({ className }: FeeTrackerProps) {
  const [data, setData] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/payments/status')
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        }
      } catch (err) {
        console.error('Payment fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className={cn('animate-pulse flex items-center gap-3 p-3 bg-muted/50 rounded-lg', className)}>
        <div className="w-10 h-10 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-1/3" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const config = STATUS_CONFIG[data.current_month.status]
  const StatusIcon = config.icon

  return (
    <div className={cn('flex items-center gap-3 p-3 bg-muted/50 rounded-lg', className)}>
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', config.bgColor)}>
        <StatusIcon className={cn('w-5 h-5', config.color)} />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">
          {data.current_month.month_name} Dues
        </p>
        <p className="font-bold">{formatCurrency(data.current_month.amount)}</p>
      </div>
      <Badge variant={config.badgeVariant}>
        {config.label}
      </Badge>
    </div>
  )
}

export default FeeTracker
