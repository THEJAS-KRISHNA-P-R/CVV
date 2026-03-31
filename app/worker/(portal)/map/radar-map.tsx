'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Household {
  id: string
  nickname: string | null
  manual_address: string | null
  waste_ready: boolean
  lat: number
  lng: number
  last_pickup_at: string | null
}

interface RadarMapProps {
  households: Household[]
  workerLat: number | null
  workerLng: number | null
  highlightId: string | null
  onCollect: (h: Household) => void
}

// ── Custom marker icons (pulsing CSS-based) ──────────────────────────────────

// Inject pulsing CSS once
const injectStyles = () => {
  if (typeof document === 'undefined') return
  if (document.getElementById('radar-map-styles')) return
  const style = document.createElement('style')
  style.id = 'radar-map-styles'
  style.textContent = `
    @keyframes radar-pulse {
      0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.6); }
      70% { box-shadow: 0 0 0 12px rgba(74, 222, 128, 0); }
      100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
    }
    .radar-marker-ready {
      width: 14px; height: 14px;
      background: #4ade80;
      border-radius: 50%;
      border: 2px solid #166534;
      animation: radar-pulse 2s infinite;
    }
    .radar-marker-normal {
      width: 10px; height: 10px;
      background: #78716c;
      border-radius: 50%;
      border: 2px solid #44403c;
    }
    .radar-marker-highlight {
      width: 16px; height: 16px;
      background: #f59e0b;
      border-radius: 50%;
      border: 3px solid #b45309;
      animation: radar-pulse 1.5s infinite;
    }
    .radar-worker {
      width: 16px; height: 16px;
      background: #3b82f6;
      border-radius: 50%;
      border: 3px solid #1d4ed8;
      box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
    }
  `
  document.head.appendChild(style)
}

function makeIcon(className: string, size: number) {
  return L.divIcon({
    className: '',
    html: `<div class="${className}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  })
}

export default function RadarMap({
  households,
  workerLat,
  workerLng,
  highlightId,
  onCollect,
}: RadarMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.LayerGroup>(L.layerGroup())
  const workerMarkerRef = useRef<L.Marker | null>(null)

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    injectStyles()

    if (!containerRef.current || mapRef.current) return

    const center: [number, number] = workerLat && workerLng
      ? [workerLat, workerLng]
      : [8.891, 76.614] // Kollam default

    const map = L.map(containerRef.current, {
      center,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'topright' }).addTo(map)
    L.control.attribution({ position: 'bottomright' }).addTo(map)

    markersRef.current.addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ── Update household markers ──────────────────────────────────────────────
  useEffect(() => {
    const markers = markersRef.current
    markers.clearLayers()

    households.forEach(h => {
      if (!h.lat || !h.lng) return

      const isHighlight = h.id === highlightId
      const cls = isHighlight
        ? 'radar-marker-highlight'
        : h.waste_ready
        ? 'radar-marker-ready'
        : 'radar-marker-normal'
      const size = isHighlight ? 16 : h.waste_ready ? 14 : 10

      const marker = L.marker([h.lat, h.lng], { icon: makeIcon(cls, size) })

      const name = h.nickname || h.manual_address || 'Household'
      const lastPickup = h.last_pickup_at
        ? new Date(h.last_pickup_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        : 'Never'

      const popupContent = `
        <div style="font-family: system-ui; min-width: 160px;">
          <p style="font-weight:600; margin:0 0 4px; font-size:14px;">${name}</p>
          <p style="color:#888; font-size:11px; margin:0 0 4px;">Last pickup: ${lastPickup}</p>
          ${h.waste_ready ? `
            <button
              id="collect-${h.id}"
              style="
                background: #166534; color: #fff; border: none;
                padding: 6px 12px; border-radius: 6px; font-size: 12px;
                cursor: pointer; width: 100%; margin-top: 4px;
              "
            >
              ✓ Collect Now
            </button>
          ` : ''}
        </div>
      `

      marker.bindPopup(popupContent, { closeButton: true })

      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`collect-${h.id}`)
          if (btn) btn.addEventListener('click', () => onCollect(h))
        }, 50)
      })

      markers.addLayer(marker)
    })

    // Fly to highlighted household
    if (highlightId && mapRef.current) {
      const target = households.find(h => h.id === highlightId)
      if (target && target.lat && target.lng) {
        mapRef.current.flyTo([target.lat, target.lng], 17, { duration: 1 })
      }
    }
  }, [households, highlightId, onCollect])

  // ── Update worker position ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return

    if (workerLat && workerLng) {
      if (workerMarkerRef.current) {
        workerMarkerRef.current.setLatLng([workerLat, workerLng])
      } else {
        workerMarkerRef.current = L.marker([workerLat, workerLng], {
          icon: makeIcon('radar-worker', 16),
          zIndexOffset: 1000,
        })
          .bindPopup('<b>Your Location</b>')
          .addTo(mapRef.current)
      }
    }
  }, [workerLat, workerLng])

  return <div ref={containerRef} className="w-full h-full" />
}
