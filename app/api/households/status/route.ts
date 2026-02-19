/**
 * API Route: GET /api/households/status
 * Purpose: Poll household verification status for "Anchor Handshake"
 * Returns: Household verification status, can_signal flag, and details
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface HouseholdStatusResponse {
  success: boolean
  data?: {
    household_id: string
    can_signal: boolean
    ward_number: number | null
    // Home Anchor fields
    nickname: string | null
    manual_address: string | null
    geocoded_address: string | null
    waste_ready: boolean
    has_location: boolean
  }
  error?: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json<HouseholdStatusResponse>(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }
    
    // Fetch household with Home Anchor fields
    // Using simplified schema compatible with Home Anchor system
    const { data: household, error: householdError } = await supabase
      .from('households')
      .select(`
        id,
        ward_number,
        nickname,
        manual_address,
        geocoded_address,
        waste_ready,
        location,
        created_at,
        location_updated_at
      `)
      .eq('user_id', user.id)
      .single()
    
    if (householdError) {
      // No household found - user hasn't registered one yet
      if (householdError.code === 'PGRST116') {
        return NextResponse.json<HouseholdStatusResponse>({
          success: true,
          data: {
            household_id: '',
            can_signal: false,
            ward_number: null,
            nickname: null,
            manual_address: null,
            geocoded_address: null,
            waste_ready: false,
            has_location: false,
          }
        })
      }
      
      console.error('Household fetch error:', householdError)
      return NextResponse.json<HouseholdStatusResponse>(
        { success: false, error: 'Failed to fetch household status' },
        { status: 500 }
      )
    }
    
    // With Home Anchor: user can signal once location is set
    const hasLocation = !!household.location
    const canSignal = hasLocation
    
    return NextResponse.json<HouseholdStatusResponse>({
      success: true,
      data: {
        household_id: household.id,
        can_signal: canSignal,
        ward_number: household.ward_number,
        nickname: household.nickname || null,
        manual_address: household.manual_address || null,
        geocoded_address: household.geocoded_address || null,
        waste_ready: household.waste_ready || false,
        has_location: hasLocation,
      }
    })
    
  } catch (error) {
    console.error('Household status API error:', error)
    return NextResponse.json<HouseholdStatusResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
