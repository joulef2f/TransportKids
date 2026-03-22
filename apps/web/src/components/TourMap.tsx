import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface Stop {
  address: string
  lat?: number | null
  lng?: number | null
  child?: { firstName: string; lastName: string }
  scheduledTime?: string | null
  sequenceOrder: number
}

interface TourMapProps {
  stops: Stop[]
  height?: string
  startAddress?: string | null
  endAddress?: string | null
}

const geocodeCache = new Map<string, [number, number] | null>()

async function geocodeAddress(address: string): Promise<[number, number] | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address)!
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`
    )
    const data = await res.json()
    const feat = data.features?.[0]
    const result: [number, number] | null = feat
      ? [feat.geometry.coordinates[1], feat.geometry.coordinates[0]]
      : null
    geocodeCache.set(address, result)
    return result
  } catch { geocodeCache.set(address, null); return null }
}

// OSRM public API — free road routing, no API key needed
async function getRoadRoute(coords: [number, number][]): Promise<[number, number][] | null> {
  try {
    // OSRM expects lng,lat order
    const waypoints = coords.map(([lat, lng]) => `${lng},${lat}`).join(';')
    const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`
    const res = await fetch(url)
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.length) return null
    // GeoJSON coords are [lng, lat] — swap back to [lat, lng] for Leaflet
    return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng])
  } catch { return null }
}

export function TourMap({ stops, height = '400px', startAddress, endAddress }: TourMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, { zoomControl: true }).setView([48.8566, 2.3522], 12)
    mapRef.current = map

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map)

    const loadStops = async () => {
      const coords: [number, number][] = []

      for (const stop of stops) {
        let lat = stop.lat
        let lng = stop.lng
        if (!lat || !lng) {
          const geo = await geocodeAddress(stop.address)
          if (geo) { lat = geo[0]; lng = geo[1] }
        }
        if (!lat || !lng) continue

        coords.push([lat, lng])

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:32px;height:32px;border-radius:50% 50% 50% 0;
            background:linear-gradient(135deg,#00d4ff,#0088ff);
            border:2px solid rgba(0,212,255,0.6);
            box-shadow:0 0 14px rgba(0,212,255,0.55);
            display:flex;align-items:center;justify-content:center;
            font-size:13px;font-weight:700;color:#000;
            transform:rotate(-45deg);
          "><span style="transform:rotate(45deg)">${stop.sequenceOrder + 1}</span></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -36],
        })

        const marker = L.marker([lat, lng], { icon }).addTo(map)
        const childName = stop.child ? `${stop.child.firstName} ${stop.child.lastName}` : 'Arrêt'
        const time = stop.scheduledTime
          ? new Date(stop.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : null

        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:160px">
            <div style="font-weight:700;color:#00d4ff;margin-bottom:4px">#${stop.sequenceOrder + 1} — ${childName}</div>
            <div style="font-size:12px;color:#888;margin-bottom:4px">${stop.address}</div>
            ${time ? `<div style="font-size:12px;color:#a855f7">⏱ ${time}</div>` : ''}
          </div>
        `, { className: 'dark-popup' })
      }

      // Add start marker (green)
      let startCoord: [number, number] | null = null
      if (startAddress) {
        const geo = await geocodeAddress(startAddress)
        if (geo) {
          startCoord = geo
          const icon = L.divIcon({
            className: '',
            html: `<div style="width:28px;height:28px;border-radius:50%;background:#22c55e;border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 14px rgba(34,197,94,0.6);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#000">D</div>`,
            iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16],
          })
          L.marker(geo, { icon }).bindPopup(`<div style="font-family:Inter,sans-serif"><div style="font-weight:700;color:#22c55e;margin-bottom:3px">Point de départ</div><div style="font-size:12px;color:#888">${startAddress}</div></div>`, { className: 'dark-popup' }).addTo(map)
        }
      }

      // Add end marker (red)
      let endCoord: [number, number] | null = null
      if (endAddress) {
        const geo = await geocodeAddress(endAddress)
        if (geo) {
          endCoord = geo
          const icon = L.divIcon({
            className: '',
            html: `<div style="width:28px;height:28px;border-radius:50%;background:#ef4444;border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 14px rgba(239,68,68,0.6);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">A</div>`,
            iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16],
          })
          L.marker(geo, { icon }).bindPopup(`<div style="font-family:Inter,sans-serif"><div style="font-weight:700;color:#ef4444;margin-bottom:3px">Destination finale</div><div style="font-size:12px;color:#888">${endAddress}</div></div>`, { className: 'dark-popup' }).addTo(map)
        }
      }

      // Build full route: start → stops → end
      const fullRoute = [
        ...(startCoord ? [startCoord] : []),
        ...coords,
        ...(endCoord ? [endCoord] : []),
      ]

      // Draw road route via OSRM
      if (fullRoute.length >= 2) {
        const roadCoords = await getRoadRoute(fullRoute)
        if (roadCoords) {
          L.polyline(roadCoords, { color: '#00d4ff', weight: 4, opacity: 0.85 }).addTo(map)
        } else {
          L.polyline(fullRoute, { color: '#00d4ff', weight: 3, opacity: 0.7, dashArray: '6,4' }).addTo(map)
        }
      }

      const allCoords = [
        ...(startCoord ? [startCoord] : []),
        ...coords,
        ...(endCoord ? [endCoord] : []),
      ]
      if (allCoords.length > 0) {
        map.fitBounds(L.latLngBounds(allCoords), { padding: [48, 48] })
      }
    }

    loadStops()

    return () => { map.remove(); mapRef.current = null }
  }, [stops])

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        .dark-popup .leaflet-popup-content-wrapper {
          background: rgba(8,12,24,0.96);
          border: 1px solid rgba(0,212,255,0.2);
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.65);
          color: #fff;
        }
        .dark-popup .leaflet-popup-tip { background: rgba(8,12,24,0.96); }
        .leaflet-control-zoom a {
          background: rgba(8,12,24,0.9) !important;
          border-color: rgba(0,212,255,0.2) !important;
          color: #00d4ff !important;
        }
        .leaflet-control-zoom a:hover { background: rgba(0,212,255,0.1) !important; }
        .leaflet-control-attribution {
          background: rgba(6,9,16,0.7) !important;
          color: rgba(255,255,255,0.25) !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a { color: rgba(0,212,255,0.4) !important; }
      `}</style>
      <div ref={containerRef} style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }} />
    </div>
  )
}
