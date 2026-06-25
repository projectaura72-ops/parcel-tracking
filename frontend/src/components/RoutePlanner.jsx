import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useSimulation } from '../context/SimulationContext';

const parcelIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const transportIcons = {
  truck: L.divIcon({ html: '🚚', className: 'bg-transparent text-2xl', iconSize: [30, 30], iconAnchor: [15, 15] }),
  ship: L.divIcon({ html: '🚢', className: 'bg-transparent text-2xl', iconSize: [30, 30], iconAnchor: [15, 15] }),
  plane: L.divIcon({ html: '✈️', className: 'bg-transparent text-2xl', iconSize: [30, 30], iconAnchor: [15, 15] }),
};

function ClickHandler() {
  const { addWaypoint, simulating } = useSimulation();
  useMapEvents({
    click: (e) => { if (!simulating) addWaypoint(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

export default function RoutePlanner({ previousSegments = [], currentLocation, simulating, currentSimIndex, waypoints: propWaypoints, routeGeometry: propGeometry } = {}) {
  const ctx = useSimulation();
  const wp = propWaypoints || ctx.waypoints;
  const updateWaypoint = ctx.updateWaypoint;
  const removeWaypoint = ctx.removeWaypoint;
  const simMode = ctx.simMode;
  const prevSegs = previousSegments.length > 0 ? previousSegments : ctx.previousSegments;
  const roadGeo = propGeometry || ctx.routeGeometry;

  const allCoords = wp.map((w) => [w.lat, w.lng]);
  const center = currentLocation ? [currentLocation.lat, currentLocation.lng] : (wp.length > 0 ? allCoords[0] : [20, 0]);

  let simPosition = null;
  if (simulating && currentSimIndex !== null && wp.length >= 2) {
    const idx = Math.floor(currentSimIndex);
    const frac = currentSimIndex - idx;
    if (idx < wp.length - 1) {
      const from = wp[idx], to = wp[idx + 1];
      simPosition = [
        from.lat + (to.lat - from.lat) * frac,
        from.lng + (to.lng - from.lng) * frac,
      ];
    } else if (wp.length > 0) {
      simPosition = [wp[wp.length - 1].lat, wp[wp.length - 1].lng];
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-full min-h-0">
      <div className="p-3 bg-slate-50 border-b border-slate-200 text-sm text-slate-500 flex items-center justify-between flex-shrink-0">
        <span>{simulating ? 'Simulation running — parcel moving along route' : 'Click on the map to place your waypoints'}</span>
        {prevSegs.length > 0 && (
          <span className="text-xs text-gray-400">{prevSegs.length} carrier(s) completed before you</span>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <MapContainer center={center} zoom={wp.length > 0 ? 5 : 2} className="h-full w-full min-h-0">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickHandler />

          {/* Previous carriers' completed segments (road-following when available) */}
          {prevSegs.map((seg, si) => {
            const hasRoadGeo = seg.routeGeometry && seg.routeGeometry.length >= 2;
            const coords = hasRoadGeo
              ? seg.routeGeometry.map((p) => [p.lat, p.lng])
              : seg.waypoints.map((w) => [w.lat, w.lng]);
            if (coords.length < 2) return null;
            return (
              <Polyline
                key={`prev-${si}`}
                positions={coords}
                color={seg.color || '#999'}
                weight={4}
                opacity={0.5}
                dashArray="6 4"
              />
            );
          })}

          {/* Previous segment endpoint markers (small dots) */}
          {prevSegs.map((seg, si) => {
            if (seg.waypoints.length === 0) return null;
            const last = seg.waypoints[seg.waypoints.length - 1];
            return (
              <Marker
                key={`prev-end-${si}`}
                position={[last.lat, last.lng]}
                icon={L.divIcon({ html: `<div style="width:12px;height:12px;border-radius:50%;background:${seg.color || '#999'};border:2px solid white"></div>`, className: 'bg-transparent', iconSize: [12, 12], iconAnchor: [6, 6] })}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">{seg.carrierName} handoff</p>
                    <p className="text-gray-400">{last.label}: {last.lat.toFixed(4)}, {last.lng.toFixed(4)}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Current carrier's waypoints */}
          {wp.map((w, i) => (
            <Marker key={i} position={[w.lat, w.lng]} icon={transportIcons[w.transportMode] || transportIcons.truck}>
              <Popup>
                <div className="text-sm space-y-1">
                  <p className="font-bold">{w.label}</p>
                  <p className="text-xs text-gray-400">{w.lat.toFixed(4)}, {w.lng.toFixed(4)}</p>
                  {!simulating && (
                    <>
                      <select
                        value={w.transportMode}
                        onChange={(e) => updateWaypoint(i, { transportMode: e.target.value })}
                        className="border rounded text-xs w-full p-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="truck">🚚 Truck</option>
                        <option value="ship">🚢 Ship</option>
                        <option value="plane">✈️ Plane</option>
                      </select>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeWaypoint(i); }}
                        className="text-red-500 text-xs hover:underline"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Road-based route geometry */}
          {roadGeo.length >= 2 && !simulating && (
            <Polyline
              positions={roadGeo.map((p) => [p.lat, p.lng])}
              color="#6b7280"
              weight={4}
              opacity={0.7}
            />
          )}
          {/* Fallback straight-line when no road geometry */}
          {roadGeo.length < 2 && allCoords.length > 1 && !simulating && (
            <Polyline positions={allCoords} color="#6b7280" weight={3} dashArray="8 4" />
          )}

          {/* Parcel icon during simulation */}
          {simPosition && (
            <Marker position={simPosition} icon={parcelIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">Parcel in transit</p>
                  <p className="text-xs text-gray-400">{simPosition[0].toFixed(4)}, {simPosition[1].toFixed(4)}</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
