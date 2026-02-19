'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, MapPin, CreditCard, UserCheck, LogOut, Menu, X,
  Truck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/worker/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/worker/map', icon: MapPin, label: 'Pickup Radar' },
  { href: '/worker/payments', icon: CreditCard, label: 'Fees' },
  { href: '/worker/verify', icon: UserCheck, label: 'Verify' },
]

export default function WorkerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/worker/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 to-stone-950 text-amber-50">
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-amber-800/40 bg-amber-950/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-14">
          <Link href="/worker/dashboard" className="flex items-center gap-2 font-bold text-lg text-amber-300">
            <Truck className="w-5 h-5" />
            Nirman Worker
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-amber-800/60 text-amber-200'
                    : 'text-amber-400 hover:text-amber-200 hover:bg-amber-900/40'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="ml-2 text-amber-400 hover:text-red-300 hover:bg-red-950/40"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Sign Out
            </Button>
          </nav>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-amber-300"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-amber-800/40 bg-amber-950 pb-3">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium',
                  pathname.startsWith(href)
                    ? 'text-amber-200 bg-amber-800/40'
                    : 'text-amber-400 hover:text-amber-200'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 w-full"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-8">
        {children}
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-amber-800/40 bg-amber-950/95 backdrop-blur-sm">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 text-xs font-medium min-w-[4rem] py-1',
                pathname.startsWith(href)
                  ? 'text-amber-300'
                  : 'text-amber-600 hover:text-amber-400'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
