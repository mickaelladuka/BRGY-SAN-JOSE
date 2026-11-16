import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { MapPin, Loader2, X } from 'lucide-react'
import L from 'leaflet'
// Leaflet CSS is imported in main.jsx

// Fix for default marker icon in webpack/vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function LocationMarker({ position, setPosition, onLocationSelect }) {
  const map = useMap()

  useEffect(() => {
    if (position) {
      map.setView(position, 16)
    }
  }, [position, map])

  useMapEvents({
    click(e) {
      setPosition(e.latlng)
      onLocationSelect(e.latlng)
    },
  })

  return position ? <Marker position={position} draggable eventHandlers={{
    dragend: (e) => {
      const pos = e.target.getLatLng()
      setPosition(pos)
      onLocationSelect(pos)
    },
  }} /> : null
}

export default function LocationPicker({ value, lat, lng, onChange, onClose }) {
  const [position, setPosition] = useState(lat != null && lng != null ? { lat, lng } : null)
  const [loading, setLoading] = useState(false)
  const [address, setAddress] = useState(value || '')

  // Geocode address to coordinates on mount if no coords provided
  useEffect(() => {
    if (lat != null && lng != null) {
      setPosition({ lat, lng })
      return
    }
    if (!value) return
    const geocode = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=1&countrycodes=ph`)
        const data = await res.json()
        if (data && data.length > 0) {
          const pos = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
          setPosition(pos)
          setAddress(value)
        }
      } catch { /* ignore */ }
    }
    geocode()
  }, [value, lat, lng])

  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
      const data = await res.json()
      const addr = data.address || {}
      // Build a clean, short address from components
      const parts = []
      if (addr.house_number) parts.push(addr.house_number)
      if (addr.road) parts.push(addr.road)
      if (addr.suburb || addr.neighbourhood || addr.village) parts.push(addr.suburb || addr.neighbourhood || addr.village)
      if (addr.city || addr.town || addr.municipality) parts.push(addr.city || addr.town || addr.municipality)
      if (addr.state) parts.push(addr.state)
      if (parts.length > 0) return parts.join(', ')
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }
  }, [])

  const handleLocationSelect = useCallback(async (latlng) => {
    const addr = await reverseGeocode(latlng.lat, latlng.lng)
    setAddress(addr)
    onChange(addr, latlng)
  }, [reverseGeocode, onChange])

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const newPos = { lat: latitude, lng: longitude }
        setPosition(newPos)
        const addr = await reverseGeocode(latitude, longitude)
        setAddress(addr)
        onChange(addr, { lat: latitude, lng: longitude })
        setLoading(false)
      },
      () => {
        alert('Could not get your location. Please click on the map.')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(41,37,36,.55)', zIndex: 200, display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', width: 'min(600px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)' }}>
          <strong>Pick Location on Map</strong>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} strokeWidth={1.75} /></button>
        </div>
        <div style={{ padding: '.75rem 1.25rem' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={useCurrentLocation} disabled={loading} style={{ marginBottom: '.75rem' }}>
            {loading ? <Loader2 size={16} strokeWidth={1.75} style={{ animation: 'spin 1s linear infinite' }} /> : <MapPin size={16} strokeWidth={1.75} />}
            {loading ? ' Locating…' : ' Use my current location'}
          </button>
          {address && <div style={{ fontSize: '.85rem', color: 'var(--ink-light)', marginBottom: '.75rem', padding: '.5rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>{address}</div>}
        </div>
        <div style={{ height: '350px', position: 'relative' }}>
          <MapContainer center={[14.6, 121.1]} zoom={13} style={{ height: '350px', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker position={position} setPosition={setPosition} onLocationSelect={handleLocationSelect} />
          </MapContainer>
        </div>
        <div style={{ padding: '.75rem 1.25rem', borderTop: '1px solid var(--line)', display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { onChange(address, position); onClose() }} disabled={!address}>Confirm Location</button>
        </div>
      </div>
    </div>
  )
}