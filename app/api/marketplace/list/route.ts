/**
 * GET /api/marketplace/list
 * Fetch marketplace items with optional filtering
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const ward = searchParams.get('ward')
    const limit = searchParams.get('limit') || '12'

    // TODO: Implement Supabase query
    // For now, return mock data
    const mockItems = [
      {
        id: '1',
        name: 'Cement Bags',
        category: 'Cement',
        description: 'Unused cement bags',
        ward: 5,
        seller: { id: 'user-1', name: 'John', avatar: '' },
        images: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Steel Rebars',
        category: 'Rebars',
        description: 'Good quality rebars',
        ward: 3,
        seller: { id: 'user-2', name: 'Jane', avatar: '' },
        images: [],
        createdAt: new Date().toISOString(),
      },
    ]

    return NextResponse.json(
      {
        success: true,
        items: mockItems,
        total: mockItems.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Marketplace list error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    )
  }
}
