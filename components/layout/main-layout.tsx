'use client'

import { BottomNav } from '@/components/navigation/bottom-nav'
import { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="w-full max-w-7xl mx-auto px-4 py-6 md:py-8">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
