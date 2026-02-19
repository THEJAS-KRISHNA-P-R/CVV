/**
 * API Route: /api/worker/verify
 * POST — Proximity-based household verification ("Handshake")
 *
 * Body: {
 *   household_id: string
 *   lat: number          // worker's current GPS
 *   lng: number
 *   action: 'verify' | 'reject'
 *   rejection_reason?: string
 * }
 *
 * Rules:
 *   - Worker must be within 50m of the household Home Anchor
 *   - Only works on households with verification_status = 'pending'
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_DISTANCE_METERS = 50

interface VerifyBody {
  household_id: string
  lat: number
  lng: number
  action: 'verify' | 'reject'
  rejection_reason?: string
}

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
  }

  // Verify worker (try with ward_number, fall back if migration 00008 not applied)
  let workerRole: string | null = null

  const { data: fp, error: fpErr } = await supabase
    .from('profiles')
    .select('role, ward_number')
    .eq('id', user.id)
    .single()

  if (!fpErr && fp) {
    workerRole = fp.role
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

  const body: VerifyBody = await request.json()

  if (!body.household_id || body.lat == null || body.lng == null) {
    return NextResponse.json(
      { success: false, error: 'household_id, lat, and lng are required.' },
      { status: 400 }
    )
  }

  if (!['verify', 'reject'].includes(body.action)) {
    return NextResponse.json(
      { success: false, error: 'action must be "verify" or "reject".' },
      { status: 400 }
    )
  }

  // Fetch household + location
  const { data: household, error: hErr } = await supabase
    .from('households')
    .select('id, user_id, verification_status, ward_number, location, nickname')
    .eq('id', body.household_id)
    .single()

  if (hErr || !household) {
    return NextResponse.json({ success: false, error: 'Household not found.' }, { status: 404 })
  }

  if (household.verification_status !== 'pending') {
    return NextResponse.json(
      { success: false, error: `Household already ${household.verification_status}.` },
      { status: 409 }
    )
  }

  // Parse household location
  let hLat = 0, hLng = 0
  const loc = household.location as any
  if (typeof loc === 'string') {
    const wkt = loc.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/i)
    if (wkt) { hLng = parseFloat(wkt[1]); hLat = parseFloat(wkt[2]) }
    else if (loc.startsWith('01') && loc.length >= 50) {
      try {
        const hexToDouble = (hex: string) => {
          const bytes = new Uint8Array(8)
          for (let i = 0; i < 8; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
          return new DataView(bytes.buffer).getFloat64(0, true)
        }
        hLng = hexToDouble(loc.substring(18, 34))
        hLat = hexToDouble(loc.substring(34, 50))
      } catch {}
    }
  } else if (typeof loc === 'object' && loc) {
    if (loc.coordinates) { hLng = loc.coordinates[0]; hLat = loc.coordinates[1] }
    else if ('x' in loc) { hLng = loc.x; hLat = loc.y }
  }

  if (hLat === 0 && hLng === 0) {
    return NextResponse.json(
      { success: false, error: 'Household has no valid location. Cannot verify.' },
      { status: 422 }
    )
  }

  // Proximity check
  const distance = haversineDistance(body.lat, body.lng, hLat, hLng)

  if (body.action === 'verify' && distance > MAX_DISTANCE_METERS) {
    return NextResponse.json({
      success: false,
      error: `Too far from household. You are ${Math.round(distance)}m away; must be within ${MAX_DISTANCE_METERS}m.`,
      distance_meters: Math.round(distance),
    }, { status: 403 })
  }

  // Perform verification / rejection
  const updateData: any = {
    verification_status: body.action === 'verify' ? 'verified' : 'rejected',
    anchored_by: user.id,
    updated_at: new Date().toISOString(),
  }

  if (body.action === 'verify') {
    updateData.anchored_at = new Date().toISOString()
    updateData.rejection_reason = null
  } else {
    updateData.rejection_reason = body.rejection_reason || 'Rejected by worker'
    updateData.anchored_at = null
  }

  const { error: updateErr } = await supabase
    .from('households')
    .update(updateData)
    .eq('id', body.household_id)

  if (updateErr) {
    console.error('Verify household error:', updateErr)
    return NextResponse.json(
      { success: false, error: 'Failed to update verification status.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      household_id: body.household_id,
      verification_status: updateData.verification_status,
      distance_meters: Math.round(distance),
    },
    message: body.action === 'verify'
      ? `Household "${household.nickname}" verified at ${Math.round(distance)}m.`
      : `Household "${household.nickname}" rejected.`,
  })
}
