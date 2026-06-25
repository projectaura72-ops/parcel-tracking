import * as db from './db';

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getCurrentUser() {
  const userId = localStorage.getItem('mockUserId');
  if (userId && !userId.startsWith('mock-')) return db.getUserById(userId);
  const role = localStorage.getItem('mockRole') || 'admin';
  const uid = 'mock-' + role;
  return db.findUserByFirebaseUid(uid);
}

export async function handleRequest(method, url, data, headers) {
  await delay(120 + Math.random() * 180);

  const path = url.replace(/^\/api\//, '');
  const user = getCurrentUser();
  const userId = user?._id || 'usr_unknown';

  // use explicit sim-carrier-id from headers if provided (for carrier sim override)
  const effectiveId = headers?.['x-sim-carrier-id'] || userId;

  // Auth
  if (path === 'auth/me') return { data: user };
  if (path === 'auth/carriers') {
    return { data: db.getAllUsers().filter((u) => u.role === 'carrier') };
  }
  if (path === 'auth/register' && method === 'post') {
    const created = db.registerUser(data);
    if (!created) throw new Error('Email already registered');
    return { data: created };
  }

  // Parcels
  if (path === 'parcels' && method === 'get') {
    const parcels = user?.role === 'owner'
      ? db.getOwnerParcels(userId)
      : db.getCarrierParcels(userId);
    return { data: parcels };
  }
  if (path === 'parcels/all') return { data: db.getAllParcels() };
  if (path === 'parcels' && method === 'post') {
    const parcel = db.createParcel({ ...data, ownerId: userId });
    return { data: parcel, status: 201 };
  }
  if (path.match(/^parcels\/track\//)) {
    const tn = path.replace('parcels/track/', '');
    const parcel = db.getParcelByTrackingNumber(tn);
    if (!parcel) throw new Error('Parcel not found');
    return { data: { parcel, history: [] } };
  }
  if (path.match(/^parcels\/(.+)$/) && method === 'get') {
    const id = path.match(/^parcels\/(.+)$/)[1];
    const parcel = db.getParcelById(id);
    if (!parcel) throw new Error('Parcel not found');
    return { data: parcel };
  }

  // Carriers
  if (path === 'carriers/parcels' && method === 'get') {
    const cId = data?.simCarrierId || effectiveId;
    return { data: db.getCarrierParcels(cId) };
  }
  if (path === 'carriers/scan' && method === 'post') {
    const cId = headers?.['x-sim-carrier-id'] || effectiveId;
    const result = db.scanParcel(data.trackingNumber, cId, data.lat, data.lng);
    if (!result) throw new Error('Parcel not found or already delivered');
    return { data: result };
  }
  if (path.match(/^carriers\/(.+)\/complete-segment$/) && method === 'post') {
    const id = path.match(/^carriers\/(.+)\/complete-segment$/)[1];
    const cId = headers?.['x-sim-carrier-id'] || effectiveId;
    const result = db.completeRouteSegment(id, cId);
    if (!result) throw new Error('No active segment found');
    return { data: result };
  }
  if (path.match(/^carriers\/(.+)$/) && method === 'delete') {
    const id = path.match(/^carriers\/(.+)$/)[1];
    const cId = headers?.['x-sim-carrier-id'] || effectiveId;
    const ok = db.deleteParcel(id, cId);
    if (!ok) throw new Error('Not found or not authorized');
    return { data: { message: 'Parcel deleted' } };
  }

  // Simulation
  if (path === 'simulation/route' && method === 'post') {
    const cId = headers?.['x-sim-carrier-id'] || effectiveId;
    const cName = headers?.['x-sim-carrier-name'] || user?.name || 'Carrier';
    const result = db.saveSimulationRoute(data.trackingNumber, cId, cName, data.waypoints, data.routeGeometry);
    if (!result) throw new Error('Parcel not found');
    return { data: result };
  }
  if (path.match(/^simulation\/route\//) && method === 'get') {
    const tn = path.replace('simulation/route/', '');
    return { data: db.getSimulationSegments(tn) };
  }
  if (path === 'simulation/start' && method === 'post') {
    const cId = headers?.['x-sim-carrier-id'] || effectiveId;
    const result = db.startSimulation(data.trackingNumber, cId);
    if (!result) throw new Error('No planned route found');
    return { data: result };
  }
  if (path === 'simulation/stop' && method === 'post') {
    const cId = headers?.['x-sim-carrier-id'] || effectiveId;
    const result = db.stopSimulation(data.trackingNumber, cId);
    if (!result) throw new Error('Simulation not found');
    return { data: result };
  }

  throw new Error(`Unhandled mock request: ${method} ${url}`);
}
