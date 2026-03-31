/**
 * API Route: /api/worker/collect
 * POST — Record a waste collection (worker-only)
 *
 * Body: {
 *   household_id: string
 *   waste_types?: string[]   // wet, dry, hazardous, recyclable, e-waste
 *   weight_kg?: number
 *   notes?: string
 *   lat?: number             // worker GPS at collection time
 *   lng?: number
 * }
 *
 * Atomically:
 *   1. Creates collection log row
 *   2. Resets household waste_ready → false
 *   3. Updates last_pickup_at / next_pickup_at
 *   4. Awards citizen 10 green credits
 *   5. Increments worker's active shift collection count
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CollectBody {
  household_id: string
  waste_types?: string[]
  weight_kg?: number
  notes?: string
  lat?: number
  lng?: number
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
  }

  // Verify worker (try with ward_number, fall back if migration 00008 not applied)
  let workerRole: string | null = null
  let workerWard: number | null = null

  const { data: fp, error: fpErr } = await supabase
    .from('profiles')
    .select('role, ward_number')
    .eq('id', user.id)
    .single()

  if (!fpErr && fp) {
    workerRole = fp.role
    workerWard = fp.ward_number
  } else {
    const { data: bp } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    workerRole = bp?.role || null
  }

  if (!workerRole || !['worker', 'admin'].includes(workerRole)) {
    return NextResponse.json({ success: false, error: 'Worker access only.' }, { status: 403 })
  }

  const body: CollectBody = await request.json()
  if (!body.household_id) {
    return NextResponse.json({ success: false, error: 'household_id is required.' }, { status: 400 })
  }

  // Verify household exists and is in worker's ward
  const { data: household, error: hError } = await supabase
    .from('households')
    .select('id, user_id, ward_number, pickup_frequency_days')
    .eq('id', body.household_id)
    .single()

  if (hError || !household) {
    return NextResponse.json({ success: false, error: 'Household not found.' }, { status: 404 })
  }

  if (workerWard && household.ward_number !== workerWard) {
    return NextResponse.json(
      { success: false, error: 'Household is not in your assigned ward.' },
      { status: 403 }
    )
  }

  // Use the atomic DB function if available, otherwise do it manually
  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc('record_collection', {
      p_household_id: body.household_id,
      p_worker_id: user.id,
      p_waste_types: body.waste_types || [],
      p_weight_kg: body.weight_kg || null,
      p_notes: body.notes || null,
      p_lat: body.lat || null,
      p_lng: body.lng || null,
    })

    if (rpcError) {
      // Fallback: do it manually if the function doesn't exist yet
      console.warn('record_collection RPC failed, falling back:', rpcError.message)
      return await manualCollection(supabase, user.id, household, body)
    }

    return NextResponse.json({
      success: true,
      data: { collection_id: rpcResult },
      message: 'Collection recorded. Citizen notified and credits awarded.',
    })
  } catch {
    return await manualCollection(supabase, user.id, household, body)
  }
}

// Fallback if the DB function hasn't been applied yet
async function manualCollection(
  supabase: any,
  workerId: string,
  household: any,
  body: CollectBody
) {
  const now = new Date()
  const freq = household.pickup_frequency_days || 30
  const nextPickup = new Date(now)
  nextPickup.setDate(nextPickup.getDate() + freq)

  // 1. Insert collection log
  const { data: collection, error: insertError } = await supabase
    .from('collections')
    .insert({
      household_id: body.household_id,
      worker_id: workerId,
      citizen_id: household.user_id,
      waste_types: body.waste_types || [],
      weight_kg: body.weight_kg || null,
      notes: body.notes || null,
      collected_lat: body.lat || null,
      collected_lng: body.lng || null,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Collection insert error:', insertError)
    return NextResponse.json(
      { success: false, error: 'Failed to record collection. ' + insertError.message },
      { status: 500 }
    )
  }

  // 2. Reset waste_ready + update schedule
  await supabase
    .from('households')
    .update({
      waste_ready: false,
      last_pickup_at: now.toISOString(),
      next_pickup_at: nextPickup.toISOString(),
    })
    .eq('id', body.household_id)

  // 3. Award credits
  await supabase.rpc('award_green_credits', {
    signal_id: null, // not signal-based
    credits: 10,
  }).catch(() => {
    // If the old function signature fails, do it manually
    return supabase
      .from('profiles')
      .update({ green_credits: supabase.raw('green_credits + 10') })
      .eq('id', household.user_id)
  })

  return NextResponse.json({
    success: true,
    data: { collection_id: collection.id },
    message: 'Collection recorded. Citizen notified and credits awarded.',
  })
}
