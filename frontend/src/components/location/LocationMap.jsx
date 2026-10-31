import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const INDIA_CENTER = [22.5, 79]

function Recenter({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 13))
  }, [map, position])
  return null
}

function ClickToPick({ onPick }) {
  useMapEvents({
    click(e) {
      onPick?.(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

/**
 * OpenStreetMap view with an optional marker. Click the map to choose a point.
 * CircleMarker avoids Leaflet's default image icons, which break under bundlers.
 */
export default function LocationMap({ latitude, longitude, onPick, height = 280 }) {
  const position = latitude != null && longitude != null ? [latitude, longitude] : null

  return (
    <MapContainer
      center={position ?? INDIA_CENTER}
      zoom={position ? 13 : 4}
      scrollWheelZoom={false}
      style={{ height }}
      className="z-0 w-full rounded-xl border border-slate-300"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {position && (
        <CircleMarker center={position} radius={10} pathOptions={{ color: '#b91c1c', fillColor: '#dc2626', fillOpacity: 0.8 }} />
      )}
      <Recenter position={position} />
      {onPick && <ClickToPick onPick={onPick} />}
    </MapContainer>
  )
}
