'use client'

import { useState, useCallback } from 'react'
import { API_CONFIG } from '@/lib/api-config'

export interface DetectionResult {
  category: 'Wet' | 'Dry' | 'Hazardous' | 'Unknown'
  confidence: number
  details: string
  recommendations: string[]
}

interface UseWasteDetectionReturn {
  detecting: boolean
  result: DetectionResult | null
  error: string | null
  detectFromBase64: (base64: string) => Promise<void>
  detectFromUrl: (url: string) => Promise<void>
  reset: () => void
}

export function useWasteDetection(): UseWasteDetectionReturn {
  const [detecting, setDetecting] = useState(false)
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const detect = useCallback(async (payload: Record<string, string>) => {
    setDetecting(true)
    setError(null)

    try {
      const response = await fetch(API_CONFIG.signals.detect, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Detection failed: ${response.statusText}`)
      }

      const data: DetectionResult = await response.json()
      setResult(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Detection failed'
      setError(message)
      console.error('[v0] Detection error:', err)
    } finally {
      setDetecting(false)
    }
  }, [])

  const detectFromBase64 = useCallback(
    async (base64: string) => {
      await detect({ image: base64 })
    },
    [detect]
  )

  const detectFromUrl = useCallback(
    async (url: string) => {
      await detect({ imageUrl: url })
    },
    [detect]
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    detecting,
    result,
    error,
    detectFromBase64,
    detectFromUrl,
    reset,
  }
}
