'use client'

import { BottomNav } from '@/components/navigation/bottom-nav'
import { TopNavbar } from '@/components/navigation/top-navbar'
import { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <main className="w-full max-w-7xl mx-auto px-4 py-6 md:py-8 pb-24 md:pb-8">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
