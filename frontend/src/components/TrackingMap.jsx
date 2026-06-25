import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

const icon = L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41] });

function AutoFollow({ position }) {
  const map = useMap();
  if (position) map.setView([position.lat, position.lng], map.getZoom());
  return null;
}

export default function TrackingMap({ position, routeSegments = [], height = 'h-full' }) {
  if (!position) return (
    <div className={`${height} bg-gray-200 rounded-lg flex items-center justify-center text-gray-400`}>
      No location data
    </div>
  );

  const pos = [position.lat, position.lng];

  return (
    <div className={`${height} rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden relative`}>
      <MapContainer center={pos} zoom={13} className="h-full w-full rounded-3xl">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <AutoFollow position={position} />
        <Marker position={pos} icon={icon}>
          <Popup>Current Location</Popup>
        </Marker>
        {routeSegments.map((seg, i) => {
          const coords = seg.points.map((p) => [p.lat, p.lng]);
          if (coords.length < 2) return null;
          const isCompleted = seg.status === 'completed';
          return (
            <Polyline
              key={i}
              positions={coords}
              color={seg.color}
              weight={isCompleted ? 3 : 4}
              opacity={isCompleted ? 0.5 : 0.8}
              dashArray={isCompleted ? '6 3' : undefined}
            />
          );
        })}
      </MapContainer>
      {routeSegments.length > 0 && (
        <div className="absolute top-2 right-2 bg-white/90 rounded-lg shadow p-2 text-xs space-y-1 z-[1000]">
          {routeSegments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`w-3 h-1 rounded-full ${seg.status === 'completed' ? 'opacity-50' : ''}`} style={{ backgroundColor: seg.color }} />
              <span>{seg.carrierName}</span>
              {seg.status === 'completed' && <span className="text-green-600 text-[10px]">✓</span>}
              {seg.fromLabel && <span className="text-gray-400 text-[10px]">{seg.fromLabel}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
