'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  PlayCircle, StopCircle, Navigation, Loader2,
  Home, AlertTriangle, UserCheck, Package, Timer,
  MapPin, RefreshCcw, ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useWorkerStore } from '@/lib/stores/worker-store'
import Link from 'next/link'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDuration(startedAt: string) {
  const ms = Date.now() - new Date(startedAt).getTime()
  const mins = Math.floor(ms / 60000)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) return `${hrs}h ${mins % 60}m`
  return `${mins}m`
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WorkerDashboard() {
  const {
    workerId, workerName, wardNumber,
    lat, lng, locationError,
    shift, shiftLoading,
    stats,
    setWorker, setStats,
    startShift, endShift, fetchShift,
    startTracking, stopTracking, updateServerLocation,
  } = useWorkerStore()

  const [loading, setLoading] = useState(true)
  const [recentHouseholds, setRecentHouseholds] = useState<any[]>([])
  const [migrationPending, setMigrationPending] = useState(false)
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const clockRef = useRef<NodeJS.Timeout | null>(null)
  const [shiftDuration, setShiftDuration] = useState<string>('')

  // ── Bootstrap: fetch profile + shift ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/worker/profile')
        const json = await res.json()
        if (!cancelled && json.success) {
          setWorker(json.data.id, json.data.full_name, json.data.ward_number)
          setStats({
            todayCollections: json.data.stats.today_collections,
            totalHouseholds: json.data.stats.total_households,
            wasteReady: json.data.stats.waste_ready,
            pendingVerification: json.data.stats.pending_verification,
          })
          setMigrationPending(!json.migration_applied)
          if (json.data.shift) {
            // shift already stored via fetchShift below
          }
        } else if (!cancelled) {
          // API returned error — likely role/auth issue
          toast.error('Profile load failed', { description: json.error || 'Unknown error' })
        }
      } catch {
        toast.error('Failed to load profile')
      }
      await fetchShift()
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  // ── Start GPS tracking on mount ────────────────────────────────────────────
  useEffect(() => {
    startTracking()
    return () => stopTracking()
  }, [])

  // ── Location updates every 30s when shift is active ───────────────────────
  useEffect(() => {
    if (shift) {
      locationIntervalRef.current = setInterval(() => {
        updateServerLocation()
      }, 30_000)
    }
    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current)
    }
  }, [shift])

  // ── Shift clock ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (shift) {
      setShiftDuration(fmtDuration(shift.started_at))
      clockRef.current = setInterval(() => {
        setShiftDuration(fmtDuration(shift.started_at))
      }, 60_000)
    } else {
      setShiftDuration('')
    }
    return () => {
      if (clockRef.current) clearInterval(clockRef.current)
    }
  }, [shift])

  // ── Fetch waste-ready households ──────────────────────────────────────────
  useEffect(() => {
    fetchWasteReady()
  }, [])

  const fetchWasteReady = async () => {
    try {
      const res = await fetch('/api/worker/households?filter=waste_ready')
      const json = await res.json()
      if (json.success) setRecentHouseholds(json.data || [])
    } catch { /* swallow */ }
  }

  // ── Shift handlers ─────────────────────────────────────────────────────────
  const handleStartShift = async () => {
    await startShift()
    toast.success('Shift started', {
      description: `Ward ${wardNumber || '—'} • GPS tracking active`,
    })
    updateServerLocation()
  }

  const handleEndShift = async () => {
    await endShift()
    toast.success('Shift ended', { description: 'Great work today!' })
  }

  const refreshAll = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/worker/profile')
      const json = await res.json()
      if (json.success) {
        setStats({
          todayCollections: json.data.stats.today_collections,
          totalHouseholds: json.data.stats.total_households,
          wasteReady: json.data.stats.waste_ready,
          pendingVerification: json.data.stats.pending_verification,
        })
      }
      await fetchWasteReady()
      await fetchShift()
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-100">
            Welcome, {workerName || 'Worker'}
          </h1>
          <p className="text-amber-400/80 text-sm mt-0.5">
            Ward {wardNumber ?? '—'} • {new Date().toLocaleDateString('en-IN', {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <Button
          variant="ghost" size="icon"
          onClick={refreshAll}
          className="text-amber-400 hover:text-amber-200 hover:bg-amber-900/40"
        >
          <RefreshCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* ── Migration Banner ──────────────────────────────────────────── */}
      {migrationPending && (
        <div className="rounded-lg border border-amber-600 bg-amber-900/60 p-4 space-y-1">
          <p className="text-sm font-medium text-amber-200">Database migration recommended</p>
          <p className="text-xs text-amber-400">
            Run <code className="font-mono bg-amber-800 px-1 rounded">00008_worker_layer.sql</code> in your Supabase SQL Editor to enable shift tracking, collection logs, and ward assignment.
          </p>
        </div>
      )}

      {/* ── GPS + Shift Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* GPS Card */}
        <Card className="bg-amber-900/30 border-amber-800/40">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className={cn(
                  'w-5 h-5',
                  lat ? 'text-green-400' : 'text-red-400'
                )} />
                <span className="text-sm font-medium text-amber-200">
                  GPS {lat ? 'Active' : 'Inactive'}
                </span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  lat
                    ? 'border-green-600 text-green-400'
                    : 'border-red-600 text-red-400'
                )}
              >
                {lat ? 'Tracking' : locationError || 'Waiting…'}
              </Badge>
            </div>
            {lat && lng && (
              <p className="text-xs text-amber-500 font-mono">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Shift Card */}
        <Card className="bg-amber-900/30 border-amber-800/40">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-amber-300" />
                <span className="text-sm font-medium text-amber-200">
                  {shift ? 'Shift Active' : 'Off Duty'}
                </span>
              </div>
              {shift && (
                <Badge className="bg-green-900/60 text-green-300 border-green-700 text-xs">
                  {shiftDuration}
                </Badge>
              )}
            </div>
            <Button
              onClick={shift ? handleEndShift : handleStartShift}
              disabled={shiftLoading}
              className={cn(
                'w-full',
                shift
                  ? 'bg-red-900/60 hover:bg-red-800/60 border-red-700 text-red-200'
                  : 'bg-green-900/60 hover:bg-green-800/60 border-green-700 text-green-200'
              )}
              variant="outline"
            >
              {shiftLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : shift ? (
                <StopCircle className="w-4 h-4 mr-2" />
              ) : (
                <PlayCircle className="w-4 h-4 mr-2" />
              )}
              {shift ? 'End Shift' : 'Start Shift'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Stats Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            icon: Package,
            label: 'Today\'s Collections',
            value: stats.todayCollections,
            color: 'text-green-400',
            bg: 'bg-green-950/40',
          },
          {
            icon: AlertTriangle,
            label: 'Waste Ready',
            value: stats.wasteReady,
            color: 'text-amber-400',
            bg: 'bg-amber-950/40',
            href: '/worker/map',
          },
          {
            icon: UserCheck,
            label: 'Pending Verify',
            value: stats.pendingVerification,
            color: 'text-blue-400',
            bg: 'bg-blue-950/40',
            href: '/worker/verify',
          },
          {
            icon: Home,
            label: 'Total Households',
            value: stats.totalHouseholds,
            color: 'text-stone-400',
            bg: 'bg-stone-950/40',
          },
        ].map(({ icon: Icon, label, value, color, bg, href }) => {
          const inner = (
            <Card key={label} className={cn('border-amber-800/30', bg)}>
              <CardContent className="pt-4 pb-3 text-center">
                <Icon className={cn('w-5 h-5 mx-auto mb-1', color)} />
                <p className="text-2xl font-bold text-amber-100">{value}</p>
                <p className="text-xs text-amber-500 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          )
          return href ? (
            <Link key={label} href={href} className="block">
              {inner}
            </Link>
          ) : (
            <div key={label}>{inner}</div>
          )
        })}
      </div>

      {/* ── Waste-Ready Alerts ───────────────────────────────────────── */}
      <Card className="bg-amber-900/20 border-amber-800/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-amber-200 flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Active Waste Signals
            </CardTitle>
            <Link href="/worker/map">
              <Button variant="ghost" size="sm" className="text-amber-400 hover:text-amber-200 text-xs">
                View on Map <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <CardDescription className="text-amber-500">
            Households in Ward {wardNumber ?? '—'} with waste ready for collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentHouseholds.length === 0 ? (
            <div className="text-center py-6 text-amber-500 text-sm">
              No active waste-ready signals in your ward.
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {recentHouseholds.slice(0, 10).map((h: any) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-amber-950/50 border border-amber-800/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-amber-100 truncate">
                        {h.nickname || h.manual_address || 'Unnamed'}
                      </p>
                      {h.manual_address && h.nickname && (
                        <p className="text-xs text-amber-500 truncate">{h.manual_address}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {h.lat > 0 && lat && lng && (
                      <span className="text-xs text-amber-500">
                        {haversineKm(lat, lng, h.lat, h.lng)}
                      </span>
                    )}
                    <Link href={`/worker/map?household=${h.id}`}>
                      <Button size="sm" variant="outline" className="border-amber-700 text-amber-300 hover:bg-amber-800/50 text-xs h-7">
                        <MapPin className="w-3 h-3 mr-1" />
                        Locate
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Quick links ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/worker/map">
          <Button variant="outline" className="w-full h-auto py-4 flex-col border-amber-800/40 text-amber-300 hover:bg-amber-900/40">
            <MapPin className="w-5 h-5 mb-1" />
            <span className="text-xs">Pickup Radar</span>
          </Button>
        </Link>
        <Link href="/worker/verify">
          <Button variant="outline" className="w-full h-auto py-4 flex-col border-amber-800/40 text-amber-300 hover:bg-amber-900/40">
            <UserCheck className="w-5 h-5 mb-1" />
            <span className="text-xs">Verify Addresses</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ── Haversine for display ───────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  if (d < 1000) return `${Math.round(d)}m`
  return `${(d / 1000).toFixed(1)}km`
}
