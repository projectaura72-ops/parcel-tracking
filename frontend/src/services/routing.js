const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

export async function fetchRouteGeometry(waypoints) {
  if (waypoints.length < 2) return [];

  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
  const url = `${OSRM_URL}/${coords}?geometries=geojson&overview=full&continue_straight=false&alternatives=false`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.routes || data.routes.length === 0) return [];
    return data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
  } catch {
    return [];
  }
}
