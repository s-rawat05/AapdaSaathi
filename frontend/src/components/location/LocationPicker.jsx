import { lazy, Suspense, useState } from 'react'
import { Loader2, LocateFixed, MapPinOff } from 'lucide-react'
import AlertBanner from '../AlertBanner'
import FormField from '../FormField'

const LocationMap = lazy(() => import('./LocationMap'))

const GEO_ERRORS = {
  1: 'Location permission was denied. That is fine: type your coordinates below or tap your location on the map.',
  2: 'Your device could not determine its location. Enter it manually or tap the map.',
  3: 'Getting your location took too long. Try again, or enter it manually.',
}

// Two decimal places is roughly 1 km: enough for responders to find the area
const roundApprox = (value) => Math.round(value * 100) / 100

/**
 * Optional location input: manual lat/lon, browser geolocation, or a tap on the map.
 * value: { latitude: string, longitude: string }; onChange receives the same shape.
 */
export default function LocationPicker({ value, onChange, error }) {
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [approximate, setApproximate] = useState(false)

  const lat = value.latitude === '' ? null : Number(value.latitude)
  const lon = value.longitude === '' ? null : Number(value.longitude)
  const validPoint = lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180

  const setPoint = (latitude, longitude) => {
    const fix = (n) => (approximate ? roundApprox(n) : Number(n.toFixed(6)))
    onChange({ latitude: String(fix(latitude)), longitude: String(fix(longitude)) })
  }

  const useBrowserLocation = () => {
    setGeoError('')
    if (!('geolocation' in navigator)) {
      setGeoError('This browser cannot share location. Enter it manually or tap the map.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPoint(coords.latitude, coords.longitude)
        setLocating(false)
      },
      (err) => {
        setGeoError(GEO_ERRORS[err.code] ?? GEO_ERRORS[2])
        setLocating(false)
      },
      { enableHighAccuracy: !approximate, timeout: 15000, maximumAge: 60000 },
    )
  }

  const toggleApproximate = (checked) => {
    setApproximate(checked)
    if (checked && validPoint) onChange({ latitude: String(roundApprox(lat)), longitude: String(roundApprox(lon)) })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Sharing your location is optional. It helps rescuers reach you and is used only for emergency coordination.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={useBrowserLocation}
          disabled={locating}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LocateFixed className="h-4 w-4" aria-hidden />}
          Use my current location
        </button>
        {validPoint && (
          <button
            type="button"
            onClick={() => onChange({ latitude: '', longitude: '' })}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <MapPinOff className="h-4 w-4" aria-hidden /> Remove location
          </button>
        )}
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={approximate}
            onChange={(e) => toggleApproximate(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-navy-700"
          />
          Share approximate location only (about 1 km)
        </label>
      </div>

      <AlertBanner type="info">{geoError}</AlertBanner>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Latitude"
          name="latitude"
          type="number"
          step="any"
          min="-90"
          max="90"
          placeholder="e.g. 30.3165"
          value={value.latitude}
          onChange={(e) => onChange({ ...value, latitude: e.target.value })}
          error={error}
        />
        <FormField
          label="Longitude"
          name="longitude"
          type="number"
          step="any"
          min="-180"
          max="180"
          placeholder="e.g. 78.0322"
          value={value.longitude}
          onChange={(e) => onChange({ ...value, longitude: e.target.value })}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">
          {validPoint ? 'Your selected location' : 'Tap the map to choose your location'}
        </p>
        <Suspense
          fallback={
            <div className="flex h-[280px] items-center justify-center rounded-xl border border-slate-300 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> Loading map…
            </div>
          }
        >
          <LocationMap latitude={validPoint ? lat : null} longitude={validPoint ? lon : null} onPick={setPoint} />
        </Suspense>
      </div>
    </div>
  )
}
