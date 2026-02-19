'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface Coordinates {
  lat: number
  lng: number
}

interface MapClientProps {
  position: Coordinates
  onLocationSelect: (coords: Coordinates) => void
}

// Custom marker icon
const createCustomIcon = () => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="relative">
        <div class="absolute -top-8 -left-4 w-8 h-8 bg-green-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <div class="absolute -top-1 left-0 w-0.5 h-3 bg-green-600 mx-auto"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

// Component to handle map click events
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (coords: Coordinates) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

// Component to fly to location
function FlyToLocation({ position }: { position: Coordinates }) {
  const map = useMap()
  
  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], 17, {
        duration: 1.5,
      })
    }
  }, [position, map])
  
  return null
}

// Draggable marker component
function DraggableMarker({ 
  position, 
  onDragEnd 
}: { 
  position: Coordinates
  onDragEnd: (coords: Coordinates) => void 
}) {
  const markerRef = useRef<L.Marker>(null)
  const [icon, setIcon] = useState<L.DivIcon | null>(null)
  
  useEffect(() => {
    setIcon(createCustomIcon())
  }, [])

  const eventHandlers = {
    dragend: () => {
      const marker = markerRef.current
      if (marker) {
        const latlng = marker.getLatLng()
        onDragEnd({ lat: latlng.lat, lng: latlng.lng })
      }
    },
  }

  if (!icon) return null

  return (
    <Marker
      ref={markerRef}
      position={[position.lat, position.lng]}
      draggable={true}
      eventHandlers={eventHandlers}
      icon={icon}
    />
  )
}

export function MapClient({ position, onLocationSelect }: MapClientProps) {
  return (
    <MapContainer
      center={[position.lat, position.lng]}
      zoom={15}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onLocationSelect={onLocationSelect} />
      <FlyToLocation position={position} />
      <DraggableMarker 
        position={position} 
        onDragEnd={onLocationSelect}
      />
    </MapContainer>
  )
}

// Inject marker styles
const markerStyles = `
  .custom-marker {
    background: transparent;
    border: none;
  }
`

if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('leaflet-custom-styles')
  if (!existingStyle) {
    const styleElement = document.createElement('style')
    styleElement.id = 'leaflet-custom-styles'
    styleElement.textContent = markerStyles
    document.head.appendChild(styleElement)
  }
}
