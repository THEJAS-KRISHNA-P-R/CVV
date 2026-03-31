/**
 * API Route: /api/worker/households
 * GET  — List households in the worker's assigned ward
 *        Optionally filter by waste_ready, overdue, or pending verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
  }

  // Verify worker role (try with ward_number, fall back if migration 00008 not applied)
  let role: string | null = null
  let ward: number | null = null

  const { data: fullProfile, error: fpErr } = await supabase
    .from('profiles')
    .select('role, ward_number')
    .eq('id', user.id)
    .single()

  if (!fpErr && fullProfile) {
    role = fullProfile.role
    ward = fullProfile.ward_number
  } else {
    // Fallback: ward_number column might not exist yet
    const { data: basicProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = basicProfile?.role || null
    ward = null
  }

  if (!role || !['worker', 'admin'].includes(role)) {
    return NextResponse.json({ success: false, error: 'Worker access only.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') // 'waste_ready' | 'overdue' | 'pending_verification' | null

  // ── Determine which columns are available by probing ──────────────────────
  // Try full column set → extended set → minimal set
  const fullCols = `
    id, user_id, nickname, manual_address, geocoded_address,
    waste_ready, ward_number, verification_status,
    pickup_frequency_days, last_pickup_at, next_pickup_at,
    location, location_updated_at, created_at
  `
  const extendedCols = `
    id, user_id, nickname, manual_address, geocoded_address,
    waste_ready, ward_number,
    location, location_updated_at, created_at
  `
  const minimalCols = `id, user_id, address, location, created_at`

  let selectCols = fullCols
  let hasExtended = true
  let hasMinimal = false

  const { error: fullErr } = await supabase
    .from('households')
    .select(fullCols)
    .limit(1)

  if (fullErr) {
    // Try extended (without verification_status, pickup_frequency_days, etc.)
    const { error: extErr } = await supabase
      .from('households')
      .select(extendedCols)
      .limit(1)

    if (extErr) {
      // Fall back to minimal (original schema columns only)
      selectCols = minimalCols
      hasExtended = false
      hasMinimal = true
    } else {
      selectCols = extendedCols
    }
  }

  let query = supabase
    .from('households')
    .select(selectCols)

  // Ward-lock: workers only see their ward (skip if no ward assigned)
  if (ward && !hasMinimal) {
    query = query.eq('ward_number', ward)
  }

  // Apply filters only if columns exist
  if (filter === 'waste_ready' && !hasMinimal) {
    query = query.eq('waste_ready', true)
  } else if (filter === 'pending_verification' && selectCols.includes('verification_status')) {
    query = query.eq('verification_status', 'pending')
  } else if (filter === 'overdue' && selectCols.includes('next_pickup_at')) {
    query = query.lt('next_pickup_at', new Date().toISOString())
  }

  // Order by available columns only
  if (!hasMinimal) {
    query = query.order('waste_ready', { ascending: false })
    if (selectCols.includes('next_pickup_at')) {
      query = query.order('next_pickup_at', { ascending: true, nullsFirst: false })
    }
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data: households, error } = await query

  if (error) {
    console.error('Worker households fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch households.' }, { status: 500 })
  }

  // Parse locations and normalize shape
  const parsed = (households || []).map(h => {
    let lat = 0, lng = 0
    if (h.location) {
      const loc = h.location as any
      if (typeof loc === 'string') {
        const wkt = loc.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/i)
        if (wkt) { lng = parseFloat(wkt[1]); lat = parseFloat(wkt[2]) }
        else if (loc.startsWith('01') && loc.length >= 50) {
          try {
            const hexToDouble = (hex: string) => {
              const bytes = new Uint8Array(8)
              for (let i = 0; i < 8; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
              return new DataView(bytes.buffer).getFloat64(0, true)
            }
            lng = hexToDouble(loc.substring(18, 34))
            lat = hexToDouble(loc.substring(34, 50))
          } catch {}
        }
      } else if (typeof loc === 'object') {
        if (loc.coordinates) { lng = loc.coordinates[0]; lat = loc.coordinates[1] }
        else if ('x' in loc) { lng = loc.x; lat = loc.y }
      }
    }
    return {
      id: h.id,
      user_id: h.user_id,
      nickname: h.nickname ?? null,
      manual_address: h.manual_address ?? h.address ?? null,
      geocoded_address: h.geocoded_address ?? null,
      waste_ready: h.waste_ready ?? false,
      ward_number: h.ward_number ?? null,
      verification_status: h.verification_status ?? null,
      pickup_frequency_days: h.pickup_frequency_days ?? null,
      last_pickup_at: h.last_pickup_at ?? null,
      next_pickup_at: h.next_pickup_at ?? null,
      location_updated_at: h.location_updated_at ?? null,
      created_at: h.created_at,
      location: undefined,
      lat,
      lng,
    }
  })

  return NextResponse.json({ success: true, data: parsed })
}
