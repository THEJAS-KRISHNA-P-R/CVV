'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle, CheckCircle2, Loader2, MapPin, Package,
  RefreshCcw, X, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useWorkerStore } from '@/lib/stores/worker-store'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

// ── Types ───────────────────────────────────────────────────────────────────

interface Household {
  id: string
  user_id: string
  nickname: string | null
  manual_address: string | null
  geocoded_address: string | null
  waste_ready: boolean
  ward_number: number | null
  verification_status: string
  pickup_frequency_days: number | null
  last_pickup_at: string | null
  next_pickup_at: string | null
  lat: number
  lng: number
}

const WASTE_TYPES = [
  { id: 'wet', label: 'Wet', color: 'bg-green-600' },
  { id: 'dry', label: 'Dry', color: 'bg-blue-600' },
  { id: 'hazardous', label: 'Hazardous', color: 'bg-red-600' },
  { id: 'recyclable', label: 'Recyclable', color: 'bg-yellow-600' },
  { id: 'e-waste', label: 'E-Waste', color: 'bg-purple-600' },
]

// ── Map component (dynamic, SSR disabled) ────────────────────────────────────

const RadarMap = dynamic(() => import('./radar-map'), { ssr: false })

// ─── Component ──────────────────────────────────────────────────────────────

export default function WorkerMapPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    }>
      <WorkerMapContent />
    </Suspense>
  )
}

function WorkerMapContent() {
  const { lat, lng, wardNumber } = useWorkerStore()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('household')

  const [households, setHouseholds] = useState<Household[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'waste_ready' | 'overdue'>('all')

  // Collection dialog
  const [collecting, setCollecting] = useState<Household | null>(null)
  const [selectedWasteTypes, setSelectedWasteTypes] = useState<string[]>([])
  const [weightKg, setWeightKg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Panel toggle (mobile)
  const [panelOpen, setPanelOpen] = useState(false)

  // ── Fetch households ──────────────────────────────────────────────────────
  const fetchHouseholds = useCallback(async () => {
    setLoading(true)
    try {
      const filterParam = filter === 'all' ? '' : `?filter=${filter}`
      const res = await fetch(`/api/worker/households${filterParam}`)
      const json = await res.json()
      if (json.success) setHouseholds(json.data || [])
    } catch {
      toast.error('Failed to load households')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchHouseholds()
  }, [fetchHouseholds])

  // ── Collection handlers ───────────────────────────────────────────────────
  const openCollect = (h: Household) => {
    setCollecting(h)
    setSelectedWasteTypes([])
    setWeightKg('')
  }

  const toggleWasteType = (id: string) => {
    setSelectedWasteTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const submitCollection = async () => {
    if (!collecting) return
    if (selectedWasteTypes.length === 0) {
      toast.error('Select at least one waste type')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/worker/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_id: collecting.id,
          waste_types: selectedWasteTypes,
          weight_kg: weightKg ? parseFloat(weightKg) : undefined,
          lat, lng,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Collection recorded!', {
          description: `${collecting.nickname || 'Household'} — ${selectedWasteTypes.join(', ')}`,
        })
        setCollecting(null)
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

  // ── Derived ───────────────────────────────────────────────────────────────
  const wasteReadyCount = households.filter(h => h.waste_ready).length

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-amber-100">Pickup Radar</h1>
          <p className="text-amber-400/80 text-xs">
            Ward {wardNumber ?? '—'} • {wasteReadyCount} active signal{wasteReadyCount !== 1 ? 's' : ''}
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

      {/* ── Filter tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {[
          { key: 'waste_ready' as const, label: 'Waste Ready', count: wasteReadyCount },
          { key: 'overdue' as const, label: 'Overdue' },
          { key: 'all' as const, label: 'All' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filter === f.key
                ? 'bg-amber-700/60 text-amber-100 border-amber-600'
                : 'border-amber-800/40 text-amber-400 hover:text-amber-200 hover:border-amber-600'
            )}
          >
            {f.label}
            {f.count !== undefined && (
              <span className="ml-1 text-amber-300">({f.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Map ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden border border-amber-800/40 relative" style={{ height: '50vh', minHeight: 350 }}>
        {loading && households.length === 0 ? (
          <div className="flex items-center justify-center h-full bg-amber-950/60">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        ) : (
          <RadarMap
            households={households}
            workerLat={lat}
            workerLng={lng}
            highlightId={highlightId}
            onCollect={openCollect}
          />
        )}
      </div>

      {/* ── Household List (collapsible on mobile) ─────────────────── */}
      <div className="md:hidden">
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-amber-800/40 text-amber-300 text-sm"
        >
          <span>{households.length} household{households.length !== 1 ? 's' : ''}</span>
          {panelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <div className={cn(
        'md:block',
        panelOpen ? 'block' : 'hidden'
      )}>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {households.map(h => (
            <div
              key={h.id}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors',
                h.id === highlightId
                  ? 'bg-amber-800/40 border-amber-500'
                  : 'bg-amber-950/40 border-amber-800/30'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                {h.waste_ready && (
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-100 truncate">
                    {h.nickname || h.manual_address || 'Unnamed'}
                  </p>
                  {h.last_pickup_at && (
                    <p className="text-xs text-amber-500">
                      Last: {new Date(h.last_pickup_at).toLocaleDateString('en-IN', {
                        month: 'short', day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {h.lat > 0 && lat && lng && (
                  <span className="text-xs text-amber-500">
                    {haversineLabel(lat, lng, h.lat, h.lng)}
                  </span>
                )}
                {h.waste_ready && (
                  <Button
                    size="sm"
                    onClick={() => openCollect(h)}
                    className="bg-green-900/60 hover:bg-green-800/60 border-green-700 text-green-200 text-xs h-7"
                    variant="outline"
                  >
                    <Package className="w-3 h-3 mr-1" />
                    Collect
                  </Button>
                )}
              </div>
            </div>
          ))}
          {households.length === 0 && !loading && (
            <p className="text-center text-amber-500 text-sm py-6">
              No households match the selected filter.
            </p>
          )}
        </div>
      </div>

      {/* ── Collection Dialog (overlay) ──────────────────────────────── */}
      {collecting && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-amber-950 border border-amber-800/60 rounded-t-2xl md:rounded-2xl p-5 space-y-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-amber-100">Record Collection</h2>
              <button onClick={() => setCollecting(null)} className="text-amber-500 hover:text-amber-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Household info */}
            <div className="rounded-lg bg-amber-900/40 border border-amber-800/30 p-3">
              <p className="font-medium text-amber-200">
                {collecting.nickname || collecting.manual_address || 'Household'}
              </p>
              {collecting.manual_address && collecting.nickname && (
                <p className="text-xs text-amber-500">{collecting.manual_address}</p>
              )}
            </div>

            {/* Waste type selector */}
            <div>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-2">
                Waste Types *
              </p>
              <div className="flex flex-wrap gap-2">
                {WASTE_TYPES.map(wt => (
                  <button
                    key={wt.id}
                    onClick={() => toggleWasteType(wt.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      selectedWasteTypes.includes(wt.id)
                        ? `${wt.color} text-white border-transparent`
                        : 'border-amber-700 text-amber-300 hover:border-amber-500'
                    )}
                  >
                    {wt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Weight */}
            <div>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-2">
                Weight (kg) — optional
              </p>
              <input
                type="number"
                step="0.5"
                min="0"
                value={weightKg}
                onChange={e => setWeightKg(e.target.value)}
                placeholder="e.g. 2.5"
                className="w-full px-3 py-2 rounded-lg bg-amber-900/40 border border-amber-700 text-amber-100 placeholder-amber-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={submitCollection}
              disabled={submitting || selectedWasteTypes.length === 0}
              className="w-full bg-green-700 hover:bg-green-600 text-white"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Confirm Collection
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Distance label helper ───────────────────────────────────────────────────

function haversineLabel(lat1: number, lng1: number, lat2: number, lng2: number): string {
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
