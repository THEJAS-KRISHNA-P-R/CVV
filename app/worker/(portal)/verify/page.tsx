'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  UserCheck, Loader2, MapPin, CheckCircle2, XCircle,
  RefreshCcw, AlertTriangle, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useWorkerStore } from '@/lib/stores/worker-store'

// ── Types ────────────────────────────────────────────────────────────────────

interface PendingHousehold {
  id: string
  nickname: string | null
  manual_address: string | null
  geocoded_address: string | null
  ward_number: number | null
  verification_status: string
  lat: number
  lng: number
  distance?: number
}

const MAX_VERIFY_DISTANCE = 50 // meters

// ─── Component ──────────────────────────────────────────────────────────────

export default function WorkerVerifyPage() {
  const { lat, lng, wardNumber } = useWorkerStore()

  const [households, setHouseholds] = useState<PendingHousehold[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null) // household id being verified/rejected

  // Rejection dialog
  const [rejectTarget, setRejectTarget] = useState<PendingHousehold | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  // ── Fetch pending households ──────────────────────────────────────────────
  const fetchPending = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/worker/households?filter=pending_verification')
      const json = await res.json()
      if (json.success) {
        const withDist = (json.data || []).map((h: any) => ({
          ...h,
          distance: lat && lng && h.lat && h.lng
            ? haversineMeters(lat, lng, h.lat, h.lng)
            : null,
        }))
        // Sort by distance (closest first)
        withDist.sort((a: any, b: any) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
        setHouseholds(withDist)
      }
    } catch {
      toast.error('Failed to load pending verifications')
    } finally {
      setLoading(false)
    }
  }, [lat, lng])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  // ── Verify ─────────────────────────────────────────────────────────────────
  const handleVerify = async (h: PendingHousehold) => {
    if (!lat || !lng) {
      toast.error('GPS required', { description: 'Enable location services to verify households.' })
      return
    }
    setActioning(h.id)
    try {
      const res = await fetch('/api/worker/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_id: h.id,
          lat, lng,
          action: 'verify',
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Household verified!', {
          description: `${h.nickname || 'Household'} Home Anchor confirmed`,
        })
        fetchPending()
      } else {
        toast.error('Verification failed', { description: json.error })
      }
    } catch {
      toast.error('Network error')
    } finally {
      setActioning(null)
    }
  }

  // ── Reject ─────────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectTarget || !lat || !lng) return
    setRejecting(true)
    try {
      const res = await fetch('/api/worker/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_id: rejectTarget.id,
          lat, lng,
          action: 'reject',
          rejection_reason: rejectReason || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Household rejected', {
          description: rejectTarget.nickname || 'Household',
        })
        setRejectTarget(null)
        setRejectReason('')
        fetchPending()
      } else {
        toast.error('Failed', { description: json.error })
      }
    } catch {
      toast.error('Network error')
    } finally {
      setRejecting(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-100 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            Verify Addresses
          </h1>
          <p className="text-amber-400/80 text-sm mt-0.5">
            Handshake verification — you must be within {MAX_VERIFY_DISTANCE}m
          </p>
        </div>
        <Button
          variant="ghost" size="icon"
          onClick={fetchPending}
          className="text-amber-400 hover:text-amber-200 hover:bg-amber-900/40"
        >
          <RefreshCcw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* ── GPS Warning ──────────────────────────────────────────────── */}
      {!lat && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 flex items-center gap-2 text-red-300 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          GPS not available. Enable location services to verify households.
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
      ) : households.length === 0 ? (
        <Card className="bg-amber-900/20 border-amber-800/40">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-400 mb-3" />
            <p className="text-amber-200 font-medium">All caught up!</p>
            <p className="text-amber-500 text-sm">No pending verifications in Ward {wardNumber ?? '—'}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {households.map(h => {
            const withinRange = h.distance !== null && h.distance !== undefined && h.distance <= MAX_VERIFY_DISTANCE
            const distLabel = h.distance !== null && h.distance !== undefined
              ? h.distance < 1000
                ? `${Math.round(h.distance)}m`
                : `${(h.distance / 1000).toFixed(1)}km`
              : '—'

            return (
              <Card key={h.id} className="bg-amber-900/20 border-amber-800/40">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-amber-100 truncate">
                          {h.nickname || h.manual_address || 'Unnamed'}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs shrink-0',
                            withinRange
                              ? 'border-green-600 text-green-400'
                              : 'border-amber-700 text-amber-400'
                          )}
                        >
                          <MapPin className="w-3 h-3 mr-0.5" />
                          {distLabel}
                        </Badge>
                      </div>
                      {h.manual_address && h.nickname && (
                        <p className="text-xs text-amber-500 truncate">{h.manual_address}</p>
                      )}
                      {h.geocoded_address && (
                        <p className="text-xs text-amber-600 truncate">{h.geocoded_address}</p>
                      )}
                      {!withinRange && h.distance !== null && h.distance !== undefined && (
                        <p className="text-xs text-amber-600 mt-1">
                          Move {Math.round(h.distance - MAX_VERIFY_DISTANCE)}m closer to verify
                        </p>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleVerify(h)}
                        disabled={!withinRange || actioning === h.id || !lat}
                        className="bg-green-900/60 hover:bg-green-800/60 border-green-700 text-green-200 text-xs"
                        variant="outline"
                        title={!withinRange ? 'Move within 50m to verify' : 'Verify this household'}
                      >
                        {actioning === h.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3 mr-1" />
                            Verify
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setRejectTarget(h)}
                        disabled={actioning === h.id}
                        className="border-red-800 text-red-300 hover:bg-red-900/40 text-xs"
                        variant="outline"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Rejection Dialog ─────────────────────────────────────────── */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-amber-950 border border-amber-800/60 rounded-t-2xl md:rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-red-300">Reject Household</h2>
              <button onClick={() => setRejectTarget(null)} className="text-amber-500 hover:text-amber-300">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-lg bg-amber-900/40 border border-amber-800/30 p-3">
              <p className="font-medium text-amber-200">
                {rejectTarget.nickname || rejectTarget.manual_address || 'Household'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-2">
                Reason for rejection (optional)
              </p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Address does not match physical location"
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-amber-900/40 border border-amber-700 text-amber-100 placeholder-amber-600 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setRejectTarget(null)}
                variant="outline"
                className="flex-1 border-amber-700 text-amber-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={rejecting}
                className="flex-1 bg-red-800 hover:bg-red-700 text-white"
              >
                {rejecting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Haversine helper ────────────────────────────────────────────────────────

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
