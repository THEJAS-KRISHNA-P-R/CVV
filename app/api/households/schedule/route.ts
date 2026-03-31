/**
 * API Route: /api/households/schedule
 * GET  - Fetch pickup schedule (frequency, last pickup, next pickup)
 * POST - Update frequency OR record a new pickup (action: 'set_frequency' | 'record_pickup')
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface SchedulePayload {
  action: 'set_frequency' | 'record_pickup'
  /** Allowed: 15, 30, 60, 90 — required when action='set_frequency' */
  pickup_frequency_days?: number
}

export interface ScheduleData {
  household_id: string
  pickup_frequency_days: number
  last_pickup_at: string | null
  next_pickup_at: string | null
  days_since_last_pickup: number | null
  days_until_next_pickup: number | null
  overdue: boolean
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
  }

  // Try selecting schedule columns; fall back if migration hasn't been applied yet
  const { data: household, error } = await supabase
    .from('households')
    .select('id, pickup_frequency_days, last_pickup_at, next_pickup_at')
    .eq('user_id', user.id)
    .single()

  if (error) {
    // Column-not-found: migration pending — confirm household exists then return defaults
    const isColumnError =
      error.message?.toLowerCase().includes('does not exist') ||
      error.message?.toLowerCase().includes('column') ||
      (error as any).code === '42703'

    if (isColumnError) {
      const { data: base, error: baseError } = await supabase
        .from('households')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (baseError || !base) {
        return NextResponse.json(
          { success: false, error: 'No household found. Please set up your location first.' },
          { status: 404 }
        )
      }

      // Household exists but migration not yet applied — return safe defaults
      return NextResponse.json({
        success: true,
        migration_pending: true,
        data: {
          household_id: base.id,
          pickup_frequency_days: 30,
          last_pickup_at: null,
          next_pickup_at: null,
          days_since_last_pickup: null,
          days_until_next_pickup: null,
          overdue: false,
        } satisfies ScheduleData,
      })
    }

    // PGRST116 = no rows returned (.single() with no match)
    return NextResponse.json(
      { success: false, error: 'No household found. Please set up your location first.' },
      { status: 404 }
    )
  }

  if (!household) {
    return NextResponse.json(
      { success: false, error: 'No household found. Please set up your location first.' },
      { status: 404 }
    )
  }

  const now = new Date()
  const freq = household.pickup_frequency_days ?? 30

  const lastPickup = household.last_pickup_at ? new Date(household.last_pickup_at) : null
  const nextPickup = household.next_pickup_at ? new Date(household.next_pickup_at) : null

  const daysSinceLast = lastPickup ? diffDays(lastPickup, now) : null
  const daysUntilNext = nextPickup ? diffDays(now, nextPickup) : null

  return NextResponse.json({
    success: true,
    data: {
      household_id: household.id,
      pickup_frequency_days: freq,
      last_pickup_at: household.last_pickup_at,
      next_pickup_at: household.next_pickup_at,
      days_since_last_pickup: daysSinceLast,
      days_until_next_pickup: daysUntilNext,
      overdue: daysUntilNext !== null ? daysUntilNext < 0 : false,
    } satisfies ScheduleData,
  })
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
  }

  // Verify household exists
  const { data: household, error: fetchError } = await supabase
    .from('households')
    .select('id, pickup_frequency_days')
    .eq('user_id', user.id)
    .single()

  if (fetchError || !household) {
    return NextResponse.json(
      { success: false, error: 'No household found. Please set up your location first.' },
      { status: 404 }
    )
  }

  const body: SchedulePayload = await request.json()

  if (body.action === 'set_frequency') {
    const freq = body.pickup_frequency_days
    const VALID_FREQ = [15, 30, 60, 90]
    if (!freq || !VALID_FREQ.includes(freq)) {
      return NextResponse.json(
        { success: false, error: 'pickup_frequency_days must be one of: 15, 30, 60, 90.' },
        { status: 400 }
      )
    }

    // Re-compute next_pickup_at if we already have a last_pickup
    const { data: updated, error: updateError } = await supabase
      .from('households')
      .update({ pickup_frequency_days: freq })
      .eq('id', household.id)
      .select('id, pickup_frequency_days, last_pickup_at, next_pickup_at')
      .single()

    if (updateError) {
      const isMigrationMissing =
        updateError.message?.toLowerCase().includes('does not exist') ||
        updateError.message?.toLowerCase().includes('column') ||
        (updateError as any).code === '42703'
      return NextResponse.json(
        {
          success: false,
          error: isMigrationMissing
            ? 'Schedule columns not found. Please apply migration 00007_pickup_schedule.sql in your Supabase dashboard.'
            : 'Failed to update pickup frequency.',
        },
        { status: isMigrationMissing ? 503 : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        household_id: updated.id,
        pickup_frequency_days: updated.pickup_frequency_days,
        last_pickup_at: updated.last_pickup_at,
        next_pickup_at: updated.next_pickup_at,
      },
    })
  }

  if (body.action === 'record_pickup') {
    const now = new Date()
    const freq = household.pickup_frequency_days ?? 3
    const nextPickup = new Date(now)
    nextPickup.setDate(nextPickup.getDate() + freq)

    const { data: updated, error: updateError } = await supabase
      .from('households')
      .update({
        last_pickup_at: now.toISOString(),
        next_pickup_at: nextPickup.toISOString(),
        // Mark waste as no longer ready once pickup is recorded
        waste_ready: false,
      })
      .eq('id', household.id)
      .select('id, pickup_frequency_days, last_pickup_at, next_pickup_at')
      .single()

    if (updateError) {
      const isMigrationMissing =
        updateError.message?.toLowerCase().includes('does not exist') ||
        updateError.message?.toLowerCase().includes('column') ||
        (updateError as any).code === '42703'
      return NextResponse.json(
        {
          success: false,
          error: isMigrationMissing
            ? 'Schedule columns not found. Please apply migration 00007_pickup_schedule.sql in your Supabase dashboard.'
            : 'Failed to record pickup.',
        },
        { status: isMigrationMissing ? 503 : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        household_id: updated.id,
        pickup_frequency_days: updated.pickup_frequency_days,
        last_pickup_at: updated.last_pickup_at,
        next_pickup_at: updated.next_pickup_at,
      },
      message: 'Pickup recorded! Next collection scheduled.',
    })
  }

  return NextResponse.json(
    { success: false, error: 'Invalid action. Use set_frequency or record_pickup.' },
    { status: 400 }
  )
}
