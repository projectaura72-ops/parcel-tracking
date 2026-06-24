import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

const icon = L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41] });

function AutoFollow({ position }) {
  const map = useMap();
  if (position) map.setView([position.lat, position.lng], map.getZoom());
  return null;
}

export default function TrackingMap({ position, routeSegments = [], height = 'h-[55vh]' }) {
  if (!position) return (
    <div className={`${height} bg-gray-200 rounded-lg flex items-center justify-center text-gray-400`}>
      No location data
    </div>
  );

  const pos = [position.lat, position.lng];

  return (
    <div className={`${height} rounded-lg overflow-hidden relative`}>
      <MapContainer center={pos} zoom={13} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <AutoFollow position={position} />
        <Marker position={pos} icon={icon}>
          <Popup>Current Location</Popup>
        </Marker>
        {routeSegments.map((seg, i) => {
          const coords = seg.points.map((p) => [p.lat, p.lng]);
          if (coords.length < 2) return null;
          return (
            <Polyline key={i} positions={coords} color={seg.color} weight={4} opacity={0.8} />
          );
        })}
      </MapContainer>
      {routeSegments.length > 0 && (
        <div className="absolute top-2 right-2 bg-white/90 rounded-lg shadow p-2 text-xs space-y-1 z-[1000]">
          {routeSegments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-3 h-1 rounded-full" style={{ backgroundColor: seg.color }} />
              <span>{seg.carrierName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
