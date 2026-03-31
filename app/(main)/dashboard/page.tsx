'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Leaf, BarChart3, AlertCircle, Camera, History, ShoppingBag,
  CalendarDays, CheckCircle2, Clock, ChevronDown, Bell, BellOff,
  Loader2, TrendingUp, RefreshCcw, MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Citizen Layer Components
import { BlackspotReporter } from '@/components/citizen/blackspot-reporter'
import { FeeTracker } from '@/components/citizen/fee-tracker'

// Location/Home Anchor Components
import { LocationStatusCard, HomeAnchorDialog } from '@/components/location'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduleData {
  household_id: string
  pickup_frequency_days: number
  last_pickup_at: string | null
  next_pickup_at: string | null
  days_since_last_pickup: number | null
  days_until_next_pickup: number | null
  overdue: boolean
}

interface ProfileData {
  name: string
  greenCredits: number
  itemsInMarketplace: number
  wasteReady: boolean
}

// ─── Frequency options ────────────────────────────────────────────────────────

const FREQ_OPTIONS = [
  { days: 15, label: '15 days' },
  { days: 30, label: '1 month' },
  { days: 60, label: '2 months' },
  { days: 90, label: '3 months' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  const diff = Math.round((Date.now() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 0) return `in ${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''}`
  return `${diff} day${diff !== 1 ? 's' : ''} ago`
}

function formatNextPickup(dateStr: string | null, daysUntil: number | null): string {
  if (!dateStr) return 'Not scheduled'
  const d = new Date(dateStr)
  const label = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
  if (daysUntil === null) return label
  if (daysUntil < 0) return `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}`
  if (daysUntil === 0) return 'Today'
  if (daysUntil === 1) return 'Tomorrow'
  return `${label} (in ${daysUntil} days)`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    greenCredits: 0,
    itemsInMarketplace: 0,
    wasteReady: false,
  })
  const [schedule, setSchedule] = useState<ScheduleData | null>(null)
  const [loadingSchedule, setLoadingSchedule] = useState(true)
  const [migrationPending, setMigrationPending] = useState(false)
  const [savingFreq, setSavingFreq] = useState(false)

  const [togglingWaste, setTogglingWaste] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [showAnchorDialog, setShowAnchorDialog] = useState(false)
  const [locationKey, setLocationKey] = useState(0)

  // ── Load schedule + household on mount ────────────────────────────────────
  useEffect(() => {
    fetchHousehold()
    fetchSchedule()
  }, [])

  const fetchHousehold = async () => {
    try {
      const res = await fetch('/api/households/establish')
      const json = await res.json()
      if (json.success && json.data) {
        setProfile(prev => ({ ...prev, wasteReady: json.data.waste_ready || false }))
      }
    } catch { /* swallow */ }
  }

  const fetchSchedule = async () => {
    setLoadingSchedule(true)
    try {
      const res = await fetch('/api/households/schedule')
      const json = await res.json()
      if (json.success && json.data) {
        setSchedule(json.data)
        setMigrationPending(!!json.migration_pending)
      } else {
        setSchedule(null)
        setMigrationPending(false)
      }
    } catch {
      setSchedule(null)
      setMigrationPending(false)
    } finally {
      setLoadingSchedule(false)
    }
  }

  // ── Set frequency ──────────────────────────────────────────────────────────
  const setFrequency = async (days: number) => {
    if (!schedule || schedule.pickup_frequency_days === days) return
    setSavingFreq(true)
    try {
      const res = await fetch('/api/households/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_frequency', pickup_frequency_days: days }),
      })
      const json = await res.json()
      if (json.success) {
        await fetchSchedule()
        toast.success('Schedule updated', {
          description: `Collection every ${days === 1 ? 'day' : `${days} days`}.`,
        })
      }
    } catch {
      toast.error('Failed to update schedule')
    } finally {
      setSavingFreq(false)
    }
  }

  // ── Toggle waste ready (digital bell) ─────────────────────────────────────
  const toggleWasteReady = async () => {
    setTogglingWaste(true)
    try {
      const newVal = !profile.wasteReady
      const res = await fetch('/api/households/establish', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waste_ready: newVal }),
      })
      const json = await res.json()
      if (json.success) {
        setProfile(prev => ({ ...prev, wasteReady: newVal }))
        toast.success(newVal ? 'Signal sent!' : 'Signal cancelled', {
          description: newVal
            ? 'Your HKS worker has been notified.'
            : 'Waste ready signal withdrawn.',
        })
      } else {
        toast.error('Failed', { description: json.error })
      }
    } catch {
      toast.error('Error', { description: 'Failed to update signal.' })
    } finally {
      setTogglingWaste(false)
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const freq = schedule?.pickup_frequency_days ?? 3
  const overdue = schedule?.overdue ?? false
  const daysUntil = schedule?.days_until_next_pickup ?? null

  const scheduleStatusColor =
    overdue ? 'text-red-600 dark:text-red-400'
    : daysUntil === 0 || daysUntil === 1 ? 'text-amber-600 dark:text-amber-400'
    : 'text-green-700 dark:text-green-400'

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      <div className="space-y-6 p-4 md:p-8 max-w-6xl mx-auto">

        {/* ── Welcome ──────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your household waste collection schedule
          </p>
        </div>

        {/* ── Location Card ─────────────────────────────────────────────── */}
        <LocationStatusCard
          key={locationKey}
          onSetupClick={() => setShowAnchorDialog(true)}
          onEditClick={() => setShowAnchorDialog(true)}
          className="shadow-sm"
        />
        <HomeAnchorDialog
          open={showAnchorDialog}
          onOpenChange={setShowAnchorDialog}
          onSuccess={() => {
            setLocationKey(prev => prev + 1)
            fetchSchedule()
          }}
        />

        {/* ── Main Grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* ══ COLLECTION SCHEDULE CARD (hero) ════════════════════════ */}
            <Card className="border-primary/20 overflow-hidden bg-gradient-to-br from-emerald-50/80 to-teal-50/60 dark:from-emerald-950/60 dark:to-teal-950/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <CalendarDays className="w-5 h-5" />
                    Collection Schedule
                  </CardTitle>
                  {!loadingSchedule && schedule && (
                    <Badge
                      variant={overdue ? 'destructive' : 'secondary'}
                      className={cn(
                        'text-xs',
                        !overdue && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      )}
                    >
                      {overdue ? 'Overdue'
                        : daysUntil === 0 ? 'Due Today'
                        : daysUntil === 1 ? 'Due Tomorrow'
                        : 'On Track'}
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  Set how often your waste is collected and track pickups
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">

                {loadingSchedule ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading schedule…
                  </div>
                ) : !schedule ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Set up your home location first to enable schedule tracking.
                  </p>
                ) : migrationPending ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-4 space-y-2">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Database migration required</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Run <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">00007_pickup_schedule.sql</code> in your Supabase SQL Editor to enable schedule tracking.
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                      Go to Supabase Dashboard → SQL Editor → paste the contents of{' '}
                      <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">supabase/migrations/00007_pickup_schedule.sql</code> → Run.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* ── Frequency selector ──────────────────────────────── */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Collection frequency
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {FREQ_OPTIONS.map(opt => (
                          <button
                            key={opt.days}
                            onClick={() => setFrequency(opt.days)}
                            disabled={savingFreq}
                            className={cn(
                              'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                              freq === opt.days
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-background border-border text-muted-foreground hover:border-primary hover:text-primary'
                            )}
                          >
                            {savingFreq && freq === opt.days
                              ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{opt.label}</span>
                              : opt.label
                            }
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── Last / Next pickup display ───────────────────────── */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl p-4 border bg-white/60 dark:bg-black/20 border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">Last Pickup</span>
                        </div>
                        <p className="font-semibold text-sm leading-snug">
                          {formatRelative(schedule.last_pickup_at)}
                        </p>
                        {schedule.last_pickup_at && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(schedule.last_pickup_at).toLocaleDateString('en-IN', {
                              weekday: 'short', month: 'short', day: 'numeric',
                            })}
                          </p>
                        )}
                      </div>

                      <div className={cn(
                        'rounded-xl p-4 border',
                        overdue
                          ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
                          : daysUntil !== null && daysUntil <= 1
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                          : 'bg-white/60 dark:bg-black/20 border-border/50'
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className={cn(
                            'w-4 h-4',
                            overdue ? 'text-red-500' : daysUntil !== null && daysUntil <= 1 ? 'text-amber-500' : 'text-muted-foreground'
                          )} />
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">Next Pickup</span>
                        </div>
                        <p className={cn('font-semibold text-sm leading-snug', scheduleStatusColor)}>
                          {formatNextPickup(schedule.next_pickup_at, schedule.days_until_next_pickup)}
                        </p>
                        {!schedule.next_pickup_at && (
                          <p className="text-xs text-muted-foreground mt-0.5">Record a pickup to start</p>
                        )}
                      </div>
                    </div>

                    {/* ── Worker-confirmed note ──────────────────────────── */}
                    <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        Pickups are confirmed by your HKS collection worker.
                        Your schedule updates automatically after each visit.
                      </p>
                    </div>

                    {/* ── Digital Bell — collapsed ─────────────────────────── */}
                    <Collapsible open={bellOpen} onOpenChange={setBellOpen}>
                      <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-muted/40 transition-colors text-sm text-muted-foreground">
                          <span className="flex items-center gap-2">
                            {profile.wasteReady
                              ? <Bell className="w-4 h-4 text-green-600 animate-pulse" />
                              : <BellOff className="w-4 h-4" />
                            }
                            Digital Bell Signal
                            {profile.wasteReady && (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs px-1.5 py-0">
                                Active
                              </Badge>
                            )}
                          </span>
                          <ChevronDown className={cn('w-4 h-4 transition-transform', bellOpen && 'rotate-180')} />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className={cn(
                          'rounded-lg border-2 p-4 transition-colors',
                          profile.wasteReady
                            ? 'bg-green-50 dark:bg-green-950/40 border-green-400'
                            : 'bg-muted/30 border-transparent'
                        )}>
                          <p className="text-sm text-muted-foreground mb-3">
                            Instantly notify your nearest HKS worker that your waste is ready — even outside the scheduled slot.
                          </p>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className={cn('font-semibold', profile.wasteReady && 'text-green-700 dark:text-green-300')}>
                                {profile.wasteReady ? '✓ Signal Active' : '○ Signal Off'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {profile.wasteReady
                                  ? 'Worker has been notified'
                                  : 'Toggle to call the collection team now'}
                              </p>
                            </div>
                            <Button
                              onClick={toggleWasteReady}
                              disabled={togglingWaste}
                              variant={profile.wasteReady ? 'outline' : 'default'}
                              size="sm"
                              className={cn(!profile.wasteReady && 'bg-primary hover:bg-primary/90')}
                            >
                              {togglingWaste
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : profile.wasteReady ? 'Cancel Signal' : 'Send Signal'
                              }
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </>
                )}
              </CardContent>
            </Card>

            {/* ── Metrics row ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Leaf className="w-4 h-4 text-green-600" />
                    Green Credits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{profile.greenCredits}</p>
                  <p className="text-xs text-muted-foreground mt-1">Earned from waste management</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <RefreshCcw className="w-4 h-4 text-blue-500" />
                    Next Collection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSchedule ? (
                    <div className="h-8 w-24 bg-muted rounded animate-pulse" />
                  ) : schedule?.next_pickup_at ? (
                    <>
                      <p className={cn('text-xl font-bold', scheduleStatusColor)}>
                        {daysUntil === 0 ? 'Today'
                          : daysUntil === 1 ? 'Tomorrow'
                          : daysUntil !== null && daysUntil < 0 ? 'Overdue'
                          : `In ${daysUntil} days`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(schedule.next_pickup_at).toLocaleDateString('en-IN', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-bold text-muted-foreground">—</p>
                      <p className="text-xs text-muted-foreground mt-1">Record first pickup</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingBag className="w-4 h-4 text-amber-600" />
                    Marketplace
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{profile.itemsInMarketplace}</p>
                  <p className="text-xs text-muted-foreground mt-1">Active listings</p>
                </CardContent>
              </Card>
            </div>

            {/* ── Quick Actions ──────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { href: '/segregation', icon: Camera, label: 'AI Segregation' },
                    { href: '/marketplace', icon: BarChart3, label: 'List Item' },
                    { href: '/profile', icon: History, label: 'History' },
                    { href: '/chat', icon: MessageSquare, label: 'Messages' },
                  ].map(({ href, icon: Icon, label }) => (
                    <Button key={href} variant="outline" className="h-auto flex-col py-4" asChild>
                      <a href={href}>
                        <Icon className="w-5 h-5 mb-2" />
                        <span className="text-xs">{label}</span>
                      </a>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Info banner ────────────────────────────────────────── */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">SUCHITWA Mission Tip</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Proper waste segregation earns more green credits! Use the AI camera to classify waste correctly.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column ────────────────────────────────────────────── */}
          <div className="space-y-6">
            <FeeTracker />
            <BlackspotReporter
              onSuccess={() => {
                toast.success('Thank you for reporting!', {
                  description: 'Municipal authorities will investigate the issue.',
                })
              }}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
