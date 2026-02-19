'use client'

import { useRouter } from 'next/navigation'
import { HomeAnchorPage } from '@/components/location'

export default function SetupLocationPage() {
  const router = useRouter()

  const handleSuccess = () => {
    // Redirect to dashboard after successful anchor
    router.push('/dashboard')
  }

  return <HomeAnchorPage onSuccess={handleSuccess} />
}
