/**
 * POST /api/households/register
 * Register a new household
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // TODO: Implement Supabase integration
    // Validate and save household to database
    const { name, email, phone, ward, qrCode } = body

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Simulate API response
    return NextResponse.json(
      {
        success: true,
        household: {
          id: 'hh-' + Date.now(),
          name,
          email,
          phone,
          ward,
          qrCode,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[v0] Household registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
