import { useState, useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '@/lib/api'
import { Layout } from '@/components/layout/Layout'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Link } from 'react-router-dom'

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const statusConfig: Record<string, { label: string; color: string; variant: 'default' | 'success' | 'secondary' | 'destructive' }> = {
  PLANNED:     { label: 'Planifiée',  color: '#00d4ff', variant: 'default' },
  IN_PROGRESS: { label: 'En cours',   color: '#22c55e', variant: 'success' },
  DONE:        { label: 'Terminée',   color: '#6b7280', variant: 'secondary' },
  CANCELLED:   { label: 'Annulée',    color: '#ef4444', variant: 'destructive' },
}

// Cache géocodage (API adresse.data.gouv.fr — gratuite, sans clé, sans rate limit)
const geocodeCache = new Map<string, [number, number] | null>()

async function geocode(address: string): Promise<[number, number] | null> {
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

async function getRoadRoute(coords: [number, number][]): Promise<[number, number][] | null> {
  try {
    const waypoints = coords.map(([lat, lng]) => `${lng},${lat}`).join(';')
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`)
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.length) return null
    return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng])
  } catch { return null }
}

export function MapPage() {
  const [tours, setTours] = useState<any[]>([])
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const layersRef = useRef<L.Layer[]>([])

  useEffect(() => {
    api.tours.list({ from: date, to: date }).then(data => {
      setTours(data)
      setSelectedTourId(data[0]?.id ?? null)
    })
  }, [date])

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current).setView([48.8566, 2.3522], 12)
    mapRef.current = map

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map)

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Draw all tours on map
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear previous layers
    layersRef.current.forEach(l => map.removeLayer(l))
    layersRef.current = []

    if (tours.length === 0) return

    const allCoords: [number, number][] = []

    const drawTours = async () => {
      for (const tour of tours) {
        const color = statusConfig[tour.status]?.color || '#00d4ff'
        const isSelected = tour.id === selectedTourId
        const coords: [number, number][] = []

        // Add start marker
        if (tour.startAddress) {
          const geo = await geocode(tour.startAddress)
          if (geo) {
            const icon = L.divIcon({
              className: '',
              html: `<div style="width:${isSelected ? 26 : 18}px;height:${isSelected ? 26 : 18}px;border-radius:50%;background:#22c55e;border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 10px rgba(34,197,94,0.6);display:flex;align-items:center;justify-content:center;font-size:${isSelected ? 10 : 8}px;font-weight:700;color:#000">D</div>`,
              iconSize: [isSelected ? 26 : 18, isSelected ? 26 : 18],
              iconAnchor: [isSelected ? 13 : 9, isSelected ? 13 : 9],
              popupAnchor: [0, -16],
            })
            const m = L.marker(geo, { icon }).addTo(map)
            m.bindPopup(`<div style="font-family:Inter,sans-serif"><div style="font-weight:700;color:#22c55e;margin-bottom:3px">Départ — ${tour.name}</div><div style="font-size:11px;color:#888">${tour.startAddress}</div></div>`, { className: 'dark-popup' })
            layersRef.current.push(m)
            coords.push(geo)
            allCoords.push(geo)
          }
        }

        if (tour.stops?.length) {
          for (const stop of tour.stops) {
            let lat = stop.lat, lng = stop.lng
            if (!lat || !lng) {
              const geo = await geocode(stop.address)
              if (geo) { lat = geo[0]; lng = geo[1] }
            }
            if (!lat || !lng) continue

            coords.push([lat, lng])
            allCoords.push([lat, lng])

            const icon = L.divIcon({
              className: '',
              html: `<div style="
                width:${isSelected ? 30 : 22}px;height:${isSelected ? 30 : 22}px;
                border-radius:50% 50% 50% 0;transform:rotate(-45deg);
                background:${color};border:2px solid rgba(255,255,255,0.4);
                box-shadow:0 0 ${isSelected ? 14 : 6}px ${color}80;
                display:flex;align-items:center;justify-content:center;
                font-size:${isSelected ? 12 : 9}px;font-weight:700;color:#000;
              "><span style="transform:rotate(45deg)">${stop.sequenceOrder + 1}</span></div>`,
              iconSize: [isSelected ? 30 : 22, isSelected ? 30 : 22],
              iconAnchor: [isSelected ? 15 : 11, isSelected ? 30 : 22],
              popupAnchor: [0, -30],
            })

            const marker = L.marker([lat, lng], { icon }).addTo(map)
            const child = stop.child ? `${stop.child.firstName} ${stop.child.lastName}` : 'Arrêt'
            const time = stop.scheduledTime
              ? new Date(stop.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              : null
            marker.bindPopup(`
              <div style="font-family:Inter,sans-serif;min-width:150px">
                <div style="font-weight:700;color:${color};margin-bottom:3px">#${stop.sequenceOrder + 1} ${child}</div>
                <div style="font-size:11px;color:#888;margin-bottom:3px">${stop.address}</div>
                <div style="font-size:11px;color:#aaa">${tour.name}</div>
                ${time ? `<div style="font-size:11px;color:#a855f7;margin-top:3px">⏱ ${time}</div>` : ''}
              </div>
            `, { className: 'dark-popup' })
            layersRef.current.push(marker)
          }
        }

        // Add end marker
        if (tour.endAddress) {
          const geo = await geocode(tour.endAddress)
          if (geo) {
            const icon = L.divIcon({
              className: '',
              html: `<div style="width:${isSelected ? 26 : 18}px;height:${isSelected ? 26 : 18}px;border-radius:50%;background:#ef4444;border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 10px rgba(239,68,68,0.6);display:flex;align-items:center;justify-content:center;font-size:${isSelected ? 10 : 8}px;font-weight:700;color:#fff">A</div>`,
              iconSize: [isSelected ? 26 : 18, isSelected ? 26 : 18],
              iconAnchor: [isSelected ? 13 : 9, isSelected ? 13 : 9],
              popupAnchor: [0, -16],
            })
            const m = L.marker(geo, { icon }).addTo(map)
            m.bindPopup(`<div style="font-family:Inter,sans-serif"><div style="font-weight:700;color:#ef4444;margin-bottom:3px">Arrivée — ${tour.name}</div><div style="font-size:11px;color:#888">${tour.endAddress}</div></div>`, { className: 'dark-popup' })
            layersRef.current.push(m)
            coords.push(geo)
            allCoords.push(geo)
          }
        }

        if (coords.length >= 2) {
          const roadCoords = await getRoadRoute(coords)
          const lineCoords = roadCoords ?? coords
          const line = L.polyline(lineCoords, {
            color,
            weight: isSelected ? 4 : 2,
            opacity: isSelected ? 0.9 : 0.4,
            dashArray: (!roadCoords || !isSelected) ? '5, 5' : undefined,
          }).addTo(map)
          layersRef.current.push(line)
        }
      }

      if (allCoords.length > 0) {
        map.fitBounds(L.latLngBounds(allCoords), { padding: [40, 40] })
      }
    }

    drawTours()
  }, [tours, selectedTourId])

  return (
    <Layout>
      <div className="flex h-full overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 flex flex-col flex-shrink-0"
          style={{ borderRight: '1px solid rgba(0,212,255,0.1)', background: 'rgba(5,8,15,0.97)' }}>
          <div className="p-4" style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
            <h2 className="font-semibold mb-3 text-sm uppercase tracking-widest" style={{ color: '#00d4ff', fontFamily: 'Space Grotesk, sans-serif' }}>
              Carte du jour
            </h2>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-2">
            {tours.length === 0 && (
              <p className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Aucune tournée ce jour
              </p>
            )}
            {tours.map((t: any) => {
              const st = statusConfig[t.status] || statusConfig.PLANNED
              const isSelected = t.id === selectedTourId
              return (
                <div key={t.id}
                  className="p-3 rounded-lg cursor-pointer transition-all duration-150"
                  onClick={() => setSelectedTourId(t.id)}
                  style={{
                    border: `1px solid ${isSelected ? st.color + '50' : 'rgba(255,255,255,0.06)'}`,
                    background: isSelected ? `${st.color}10` : 'transparent',
                    boxShadow: isSelected ? `0 0 16px ${st.color}15` : 'none',
                  }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate" style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.65)' }}>{t.name}</p>
                    <Badge variant={st.variant} className="flex-shrink-0 text-xs">{st.label}</Badge>
                  </div>
                  <p className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {t.driver?.firstName} {t.driver?.lastName} · {t.vehicle?.plate}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs" style={{ color: st.color }}>
                      {t.stops?.length || 0} arrêts
                    </span>
                    {t.distanceKm && (
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {t.distanceKm.toFixed(1)} km
                      </span>
                    )}
                  </div>
                  <Link to={`/tours/${t.id}`} className="text-xs mt-1 block hover:underline" style={{ color: 'rgba(0,212,255,0.5)' }}
                    onClick={e => e.stopPropagation()}>
                    Voir le détail →
                  </Link>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="p-4" style={{ borderTop: '1px solid rgba(0,212,255,0.1)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Légende</p>
            <div className="space-y-1.5">
              {Object.entries(statusConfig).map(([, { label, color }]) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-6 h-0.5 rounded-full" style={{ background: color }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <style>{`
            .dark-popup .leaflet-popup-content-wrapper {
              background: rgba(8,12,24,0.96);
              border: 1px solid rgba(0,212,255,0.2);
              border-radius: 8px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.7);
              color: #fff;
            }
            .dark-popup .leaflet-popup-tip { background: rgba(8,12,24,0.96); }
            .leaflet-control-zoom a {
              background: rgba(8,12,24,0.92) !important;
              border-color: rgba(0,212,255,0.2) !important;
              color: #00d4ff !important;
            }
            .leaflet-control-zoom a:hover { background: rgba(0,212,255,0.1) !important; }
            .leaflet-control-attribution {
              background: rgba(6,9,16,0.75) !important;
              color: rgba(255,255,255,0.25) !important;
              font-size: 9px !important;
            }
            .leaflet-control-attribution a { color: rgba(0,212,255,0.4) !important; }
          `}</style>
          <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
        </div>
      </div>
    </Layout>
  )
}
