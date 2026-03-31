/**
 * API Route: /api/worker/shift
 * GET  — Get current active shift
 * POST — Start/end a shift OR update worker GPS
 *
 * Body: {
 *   action: 'start' | 'end' | 'update_location'
 *   lat?: number
 *   lng?: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ShiftBody {
  action: 'start' | 'end' | 'update_location'
  lat?: number
  lng?: number
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['worker', 'admin'].includes(profile.role)) {
    return NextResponse.json({ success: false, error: 'Worker access only.' }, { status: 403 })
  }

  // Find active shift (no ended_at) — table might not exist if migration 00008 not applied
  const { data: shift, error: shiftErr } = await supabase
    .from('worker_shifts')
    .select('*')
    .eq('worker_id', user.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (shiftErr && shiftErr.code !== 'PGRST116') {
    // PGRST116 = no rows found (normal). Any other error means table might not exist
    return NextResponse.json({
      success: true,
      data: null,
      active: false,
      migration_pending: true,
    })
  }

  return NextResponse.json({
    success: true,
    data: shift || null,
    active: !!shift,
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['worker', 'admin'].includes(profile.role)) {
    return NextResponse.json({ success: false, error: 'Worker access only.' }, { status: 403 })
  }

  const body: ShiftBody = await request.json()

  if (body.action === 'start') {
    // Check no existing active shift
    const { data: existing } = await supabase
      .from('worker_shifts')
      .select('id')
      .eq('worker_id', user.id)
      .is('ended_at', null)
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Shift already active. End it first.' },
        { status: 409 }
      )
    }

    const { data: shift, error } = await supabase
      .from('worker_shifts')
      .insert({
        worker_id: user.id,
        start_lat: body.lat || null,
        start_lng: body.lng || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Start shift error:', error)
      return NextResponse.json({
        success: false,
        error: error.message?.includes('relation') || error.message?.includes('does not exist')
          ? 'Apply migration 00008_worker_layer.sql to enable shift tracking.'
          : 'Failed to start shift.',
      }, { status: 500 })
    }

    // Update worker current location (ignore errors if columns don't exist)
    if (body.lat && body.lng) {
      await supabase
        .from('profiles')
        .update({
          current_lat: body.lat,
          current_lng: body.lng,
          location_updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .then(() => {}) // ignore errors
        .catch(() => {})
    }

    return NextResponse.json({ success: true, data: shift, message: 'Shift started.' })
  }

  if (body.action === 'end') {
    const { data: shift, error } = await supabase
      .from('worker_shifts')
      .update({
        ended_at: new Date().toISOString(),
        end_lat: body.lat || null,
        end_lng: body.lng || null,
      })
      .eq('worker_id', user.id)
      .is('ended_at', null)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: 'No active shift to end.' }, { status: 404 })
    }

    // Clear worker realtime location (ignore errors if columns don't exist)
    await supabase
      .from('profiles')
      .update({ current_lat: null, current_lng: null, location_updated_at: null })
      .eq('id', user.id)
      .then(() => {})
      .catch(() => {})

    return NextResponse.json({ success: true, data: shift, message: 'Shift ended.' })
  }

  if (body.action === 'update_location') {
    if (!body.lat || !body.lng) {
      return NextResponse.json(
        { success: false, error: 'lat and lng are required.' },
        { status: 400 }
      )
    }

    await supabase
      .from('profiles')
      .update({
        current_lat: body.lat,
        current_lng: body.lng,
        location_updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    return NextResponse.json({ success: true, message: 'Location updated.' })
  }

  return NextResponse.json(
    { success: false, error: 'action must be start, end, or update_location.' },
    { status: 400 }
  )
}
