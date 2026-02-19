/**
 * Worker Shift Store — Zustand
 * Manages active shift state, worker GPS, periodic location updates
 */

import { create } from 'zustand'

interface ShiftData {
  id: string
  started_at: string
  collections_count: number
}

interface WorkerState {
  // Profile
  workerId: string | null
  workerName: string | null
  wardNumber: number | null

  // GPS
  lat: number | null
  lng: number | null
  gpsWatchId: number | null
  locationError: string | null

  // Shift
  shift: ShiftData | null
  shiftLoading: boolean

  // Stats
  stats: {
    todayCollections: number
    totalHouseholds: number
    wasteReady: number
    pendingVerification: number
  }

  // Actions
  setWorker: (id: string, name: string, ward: number | null) => void
  setStats: (s: WorkerState['stats']) => void

  // Shift actions
  startShift: () => Promise<void>
  endShift: () => Promise<void>
  fetchShift: () => Promise<void>

  // GPS
  startTracking: () => void
  stopTracking: () => void
  updateServerLocation: () => Promise<void>
}

export const useWorkerStore = create<WorkerState>((set, get) => ({
  workerId: null,
  workerName: null,
  wardNumber: null,
  lat: null,
  lng: null,
  gpsWatchId: null,
  locationError: null,
  shift: null,
  shiftLoading: false,
  stats: {
    todayCollections: 0,
    totalHouseholds: 0,
    wasteReady: 0,
    pendingVerification: 0,
  },

  setWorker: (id, name, ward) => set({ workerId: id, workerName: name, wardNumber: ward }),
  setStats: (s) => set({ stats: s }),

  fetchShift: async () => {
    set({ shiftLoading: true })
    try {
      const res = await fetch('/api/worker/shift')
      const json = await res.json()
      set({ shift: json.active ? json.data : null })
    } catch {
      set({ shift: null })
    } finally {
      set({ shiftLoading: false })
    }
  },

  startShift: async () => {
    const { lat, lng } = get()
    set({ shiftLoading: true })
    try {
      const res = await fetch('/api/worker/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', lat, lng }),
      })
      const json = await res.json()
      if (json.success) set({ shift: json.data })
    } finally {
      set({ shiftLoading: false })
    }
  },

  endShift: async () => {
    const { lat, lng } = get()
    set({ shiftLoading: true })
    try {
      const res = await fetch('/api/worker/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', lat, lng }),
      })
      const json = await res.json()
      if (json.success) set({ shift: null })
    } finally {
      set({ shiftLoading: false })
    }
  },

  startTracking: () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      set({ locationError: 'Geolocation not supported' })
      return
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        set({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          locationError: null,
        })
      },
      (err) => {
        set({ locationError: err.message })
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    set({ gpsWatchId: id })
  },

  stopTracking: () => {
    const { gpsWatchId } = get()
    if (gpsWatchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(gpsWatchId)
    }
    set({ gpsWatchId: null })
  },

  updateServerLocation: async () => {
    const { lat, lng } = get()
    if (!lat || !lng) return
    try {
      await fetch('/api/worker/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_location', lat, lng }),
      })
    } catch {}
  },
}))
