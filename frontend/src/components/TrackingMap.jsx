import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

const icon = L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41] });

export default function TrackingMap({ position, route = [], height = 'h-80' }) {
  if (!position) return <div className={`${height} bg-gray-200 rounded-lg flex items-center justify-center text-gray-400`}>No location data</div>;

  const pos = [position.lat, position.lng];
  const routeCoords = route.map((p) => [p.lat, p.lng]);

  return (
    <div className={`${height} rounded-lg overflow-hidden`}>
      <MapContainer center={pos} zoom={13} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={pos} icon={icon}>
          <Popup>Current Location</Popup>
        </Marker>
        {routeCoords.length > 0 && <Polyline positions={routeCoords} color="blue" />}
      </MapContainer>
    </div>
  );
}
