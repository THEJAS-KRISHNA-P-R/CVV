/**
 * API Route: /api/worker/profile
 * GET — Get worker profile with ward info, shift status, today's stats
 * Resilient: works even if migration 00008 hasn't been applied
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Helper: fetch worker profile with fallback for missing 00008 columns
 */
async function getWorkerProfile(supabase: any, userId: string) {
  // Try extended query with migration 00008 columns
  const { data: full, error: fullErr } = await supabase
    .from('profiles')
    .select('id, full_name, role, ward_number, green_credits, current_lat, current_lng, location_updated_at')
    .eq('id', userId)
    .single()

  if (!fullErr && full) return { profile: full, migrationApplied: true }

  // Fallback: migration 00008 columns don't exist yet
  const { data: basic, error: basicErr } = await supabase
    .from('profiles')
    .select('id, full_name, role, green_credits')
    .eq('id', userId)
    .single()

  if (basicErr || !basic) return { profile: null, migrationApplied: false }

  return {
    profile: { ...basic, ward_number: null, current_lat: null, current_lng: null, location_updated_at: null },
    migrationApplied: false,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
  }

  const { profile, migrationApplied } = await getWorkerProfile(supabase, user.id)

  if (!profile || !['worker', 'admin'].includes(profile.role)) {
    return NextResponse.json({ success: false, error: 'Worker access only.' }, { status: 403 })
  }

  // Active shift (worker_shifts table might not exist)
  let shift = null
  try {
    const { data: shiftData } = await supabase
      .from('worker_shifts')
      .select('id, started_at, collections_count')
      .eq('worker_id', user.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()
    shift = shiftData
  } catch {}

  // Today's collections count (collections table might not exist)
  let todayCollections = 0
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('collections')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', user.id)
      .gte('collected_at', todayStart.toISOString())
    todayCollections = count || 0
  } catch {}

  // Households — no ward filter if worker has no ward (show all)
  // Use conditional .eq() instead of .match({}) for reliability
  let totalHouseholds = 0
  let wasteReadyCount = 0
  let pendingVerification = 0

  try {
    let q = supabase.from('households').select('id', { count: 'exact', head: true })
    if (profile.ward_number) q = q.eq('ward_number', profile.ward_number)
    const { count, error: thErr } = await q
    if (!thErr) totalHouseholds = count || 0
    else console.error('totalHouseholds query error:', thErr)
  } catch (e) {
    console.error('totalHouseholds query exception:', e)
  }

  try {
    let q = supabase.from('households').select('id', { count: 'exact', head: true }).eq('waste_ready', true)
    if (profile.ward_number) q = q.eq('ward_number', profile.ward_number)
    const { count, error: wrErr } = await q
    if (!wrErr) wasteReadyCount = count || 0
    // If waste_ready column doesn't exist, silently stay 0
  } catch {}

  // verification_status might not exist if migration 00005 not applied
  try {
    let q = supabase.from('households').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending')
    if (profile.ward_number) q = q.eq('ward_number', profile.ward_number)
    const { count } = await q
    pendingVerification = count || 0
  } catch {}

  return NextResponse.json({
    success: true,
    migration_applied: migrationApplied,
    data: {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
      ward_number: profile.ward_number,
      shift: shift
        ? { id: shift.id, started_at: shift.started_at, collections: shift.collections_count }
        : null,
      stats: {
        today_collections: todayCollections,
        total_households: totalHouseholds || 0,
        waste_ready: wasteReadyCount || 0,
        pending_verification: pendingVerification,
      },
    },
  })
}
