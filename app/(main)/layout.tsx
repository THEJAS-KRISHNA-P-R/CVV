import { ReactNode } from 'react'
import { MainLayout } from '@/components/layout/main-layout'

export default function AppMainLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <MainLayout>
      {children}
    </MainLayout>
  )
}
