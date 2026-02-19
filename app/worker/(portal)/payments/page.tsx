'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard, Loader2, RefreshCcw, IndianRupee, CheckCircle2,
  AlertTriangle, XCircle, Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useWorkerStore } from '@/lib/stores/worker-store'

// ── Types ────────────────────────────────────────────────────────────────────

interface HouseholdPayment {
  id: string
  nickname: string | null
  manual_address: string | null
  user_id: string
  ward_number: number | null
  // Payment fields (from user_payments table)
  payment_status?: 'paid' | 'pending' | 'overdue' | null
  payment_month?: string | null
  amount_due?: number
}

const MONTHLY_FEE = 50 // ₹50 per month

// ─── Component ──────────────────────────────────────────────────────────────

export default function WorkerPaymentsPage() {
  const { wardNumber } = useWorkerStore()

  const [households, setHouseholds] = useState<HouseholdPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Double-confirmation
  const [step1Target, setStep1Target] = useState<HouseholdPayment | null>(null)
  const [step2Target, setStep2Target] = useState<HouseholdPayment | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── Fetch households with payment info ────────────────────────────────────
  const fetchHouseholds = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/worker/households')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      // For each household, check payment status
      const householdsData = json.data || []

      // Fetch payment statuses in parallel
      const withPayments = await Promise.all(
        householdsData.map(async (h: any) => {
          try {
            const pRes = await fetch(`/api/payments/status?user_id=${h.user_id}`)
            const pJson = await pRes.json()
            const cm = pJson.success && pJson.data?.current_month
            return {
              ...h,
              payment_status: cm ? cm.status : 'pending',
              payment_month: cm ? cm.month_name : null,
              amount_due: cm ? cm.amount : MONTHLY_FEE,
            }
          } catch {
            return { ...h, payment_status: 'pending', payment_month: null, amount_due: MONTHLY_FEE }
          }
        })
      )

      setHouseholds(withPayments)
    } catch {
      toast.error('Failed to load households')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHouseholds()
  }, [fetchHouseholds])

  // ── Double-confirmation flow ──────────────────────────────────────────────
  const handleStep1 = (h: HouseholdPayment) => {
    setStep1Target(h)
    setStep2Target(null)
  }

  const handleStep2 = () => {
    setStep2Target(step1Target)
    setStep1Target(null)
  }

  const handleConfirmPayment = async () => {
    if (!step2Target) return
    setSubmitting(true)
    try {
      const currentMonth = new Date().toISOString().substring(0, 7) // YYYY-MM
      const res = await fetch('/api/payments/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: step2Target.user_id,
          status: 'paid',
          month: currentMonth,
          amount: MONTHLY_FEE,
          method: 'cash',
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Payment recorded!', {
          description: `₹${MONTHLY_FEE} from ${step2Target.nickname || 'Household'}`,
        })
        setStep2Target(null)
        fetchHouseholds()
      } else {
        toast.error('Failed', { description: json.error })
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const cancelDialog = () => {
    setStep1Target(null)
    setStep2Target(null)
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = households.filter(h => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (h.nickname || '').toLowerCase().includes(q) ||
      (h.manual_address || '').toLowerCase().includes(q)
    )
  })

  const paidCount = households.filter(h => h.payment_status === 'paid').length
  const pendingCount = households.filter(h => h.payment_status !== 'paid').length

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-100 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-amber-400" />
            Fee Collection
          </h1>
          <p className="text-amber-400/80 text-sm mt-0.5">
            Ward {wardNumber ?? '—'} • ₹{MONTHLY_FEE}/month per household
          </p>
        </div>
        <Button
          variant="ghost" size="icon"
          onClick={fetchHouseholds}
          className="text-amber-400 hover:text-amber-200 hover:bg-amber-900/40"
        >
          <RefreshCcw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-green-950/40 border-amber-800/30">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-2xl font-bold text-green-400">{paidCount}</p>
            <p className="text-xs text-amber-500">Paid</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-950/40 border-amber-800/30">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
            <p className="text-xs text-amber-500">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-950/40 border-amber-800/30">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-300">₹{pendingCount * MONTHLY_FEE}</p>
            <p className="text-xs text-amber-500">To Collect</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Search ─────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search households…"
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-amber-900/30 border border-amber-800/40 text-amber-100 placeholder-amber-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* ── Household List ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-amber-900/20 border-amber-800/40">
          <CardContent className="py-12 text-center">
            <p className="text-amber-200 font-medium">No households found</p>
            <p className="text-amber-500 text-sm mt-1">
              {searchQuery ? 'Try a different search term' : 'No households in your ward'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(h => {
            const isPaid = h.payment_status === 'paid'
            return (
              <Card key={h.id} className="bg-amber-900/20 border-amber-800/40">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-amber-100 text-sm truncate">
                          {h.nickname || h.manual_address || 'Unnamed'}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs shrink-0',
                            isPaid
                              ? 'border-green-600 text-green-400'
                              : 'border-amber-600 text-amber-400'
                          )}
                        >
                          {isPaid ? 'Paid' : 'Pending'}
                        </Badge>
                      </div>
                      {h.manual_address && h.nickname && (
                        <p className="text-xs text-amber-500 truncate">{h.manual_address}</p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {isPaid ? (
                        <div className="flex items-center gap-1 text-green-400 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          ₹{MONTHLY_FEE}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleStep1(h)}
                          className="bg-amber-800/60 hover:bg-amber-700/60 border-amber-600 text-amber-200 text-xs h-8"
                          variant="outline"
                        >
                          <IndianRupee className="w-3 h-3 mr-1" />
                          Collect ₹{MONTHLY_FEE}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Step 1 Dialog: "Have you physically received the cash?" ── */}
      {step1Target && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-amber-950 border border-amber-800/60 rounded-t-2xl md:rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-amber-100 flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-amber-400" />
                Verify Cash Received
              </h2>
              <button onClick={cancelDialog} className="text-amber-500 hover:text-amber-300">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-lg bg-amber-900/40 border border-amber-800/30 p-4">
              <p className="font-medium text-amber-200">
                {step1Target.nickname || step1Target.manual_address || 'Household'}
              </p>
              <p className="text-2xl font-bold text-amber-100 mt-2">₹{MONTHLY_FEE}</p>
              <p className="text-xs text-amber-500 mt-1">Monthly waste collection fee</p>
            </div>

            <div className="rounded-lg border border-amber-600 bg-amber-900/40 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-300">
                Have you <strong>physically received ₹{MONTHLY_FEE}</strong> in cash from this household?
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={cancelDialog}
                variant="outline"
                className="flex-1 border-amber-700 text-amber-300"
              >
                No, Cancel
              </Button>
              <Button
                onClick={handleStep2}
                className="flex-1 bg-amber-700 hover:bg-amber-600 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Yes, Cash Received
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2 Dialog: "Are you sure? This will mark as PAID" ─── */}
      {step2Target && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-amber-950 border border-red-800/60 rounded-t-2xl md:rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Final Confirmation
              </h2>
              <button onClick={cancelDialog} className="text-amber-500 hover:text-amber-300">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-lg bg-red-950/40 border border-red-800/40 p-4 space-y-2">
              <p className="text-sm text-red-300">
                You are about to mark <strong>{step2Target.nickname || 'Household'}</strong> as <strong>PAID</strong> for this month.
              </p>
              <p className="text-sm text-red-400 font-semibold">
                This action cannot be undone.
              </p>
              <p className="text-xs text-amber-500 mt-2">
                Amount: ₹{MONTHLY_FEE} • Method: Cash • Month: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={cancelDialog}
                variant="outline"
                className="flex-1 border-amber-700 text-amber-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPayment}
                disabled={submitting}
                className="flex-1 bg-green-700 hover:bg-green-600 text-white"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Issue Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
