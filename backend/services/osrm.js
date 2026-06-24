const axios = require('axios');
const config = require('../config');

async function getRoute(origin, destination) {
  const { data } = await axios.get(
    `${config.osrmBaseUrl}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`,
    { params: { overview: 'full', geometries: 'geojson', steps: 'false' } }
  );

  if (data.code !== 'Ok') throw new Error('OSRM route not found');

  const route = data.routes[0];
  const coordinates = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));

  return {
    distance: route.distance,
    duration: route.duration,
    coordinates,
  };
}

async function getDistanceRemaining(origin, destination) {
  const route = await getRoute(origin, destination);
  return { distance: route.distance, duration: route.duration };
}

module.exports = { getRoute, getDistanceRemaining };
