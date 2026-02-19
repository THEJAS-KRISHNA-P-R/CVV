/**
 * Next.js Middleware
 * Handles authentication and routing
 */

import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // For now, just allow all requests through
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all pathnames except for:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - public folder
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)',
  ],
}
