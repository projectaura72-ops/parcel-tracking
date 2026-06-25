const DB_KEY = 'mock_tracking_db';

const SEED = {
  users: [
    { _id: 'usr_admin', firebaseUid: 'mock-admin', name: 'Admin', email: 'admin@test.com', role: 'admin' },
    { _id: 'usr_owner', firebaseUid: 'mock-owner', name: 'Alice (Owner)', email: 'owner@test.com', role: 'owner' },
    { _id: 'usr_carrier1', firebaseUid: 'mock-carrier', name: 'Bob (Carrier)', email: 'carrier@test.com', role: 'carrier' },
    { _id: '000000000000000000000001', firebaseUid: 'mock-carrier1', name: 'Mock Carrier 1', email: 'carrier1@test.com', role: 'carrier' },
    { _id: '000000000000000000000002', firebaseUid: 'mock-carrier2', name: 'Mock Carrier 2', email: 'carrier2@test.com', role: 'carrier' },
    { _id: '000000000000000000000003', firebaseUid: 'mock-carrier3', name: 'Mock Carrier 3', email: 'carrier3@test.com', role: 'carrier' },
  ],
  parcels: [],
};

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function save(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getDb() {
  let db = load();
  if (!db) {
    db = { users: [...SEED.users], parcels: [...SEED.parcels] };
    save(db);
  }
  return db;
}

function generateId() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function generateTrackingNumber() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function findUser(role) {
  const db = getDb();
  return db.users.find((u) => u.role === role) || db.users[0];
}

export function getUserById(id) {
  const db = getDb();
  return db.users.find((u) => u._id === id);
}

export function findUserByFirebaseUid(uid) {
  const db = getDb();
  const user = db.users.find((u) => u.firebaseUid === uid);
  if (user) return { ...user };
  const role = uid?.replace('mock-', '') || 'admin';
  const newUser = {
    _id: 'usr_' + role + '_' + Date.now(),
    firebaseUid: uid,
    name: `Mock ${role.charAt(0).toUpperCase() + role.slice(1)}`,
    email: `${role}@test.com`,
    role,
  };
  db.users.push(newUser);
  save(db);
  return newUser;
}

export function registerUser({ name, email, password, role }) {
  const db = getDb();
  const exists = db.users.find((u) => u.email === email);
  if (exists) return null;
  const newUser = {
    _id: generateId(),
    firebaseUid: 'mock-' + email.split('@')[0],
    name,
    email,
    role: role || 'carrier',
  };
  db.users.push(newUser);
  save(db);
  return newUser;
}

export function getAllUsers() {
  return getDb().users;
}

export function getOwnerParcels(ownerId) {
  const db = getDb();
  return db.parcels.filter((p) => p.ownerId === ownerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getAllParcels() {
  return getDb().parcels.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getCarrierParcels(carrierId) {
  const db = getDb();
  return db.parcels.filter((p) => {
    if (p.currentCarrier === carrierId) return true;
    if (p.routeSegments?.some((s) => s.carrierId === carrierId)) return true;
    return false;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getParcelByTrackingNumber(trackingNumber) {
  const db = getDb();
  return db.parcels.find((p) => p.trackingNumber === trackingNumber) || null;
}

export function getParcelById(id) {
  const db = getDb();
  return db.parcels.find((p) => p._id === id) || null;
}

export function createParcel({ name, description, origin, destination, ownerId }) {
  const db = getDb();
  const parcel = {
    _id: generateId(),
    trackingNumber: generateTrackingNumber(),
    qrCode: generateTrackingNumber(),
    name,
    description: description || '',
    ownerId,
    currentCarrier: null,
    status: 'pending',
    origin: origin || 'Unknown',
    destination: destination || 'Unknown',
    currentLocation: null,
    routeSegments: [],
    simulationSegments: [],
    estimatedDelivery: null,
    deliveredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.parcels.unshift(parcel);
  save(db);
  return parcel;
}

export function deleteParcel(parcelId, carrierId) {
  const db = getDb();
  const idx = db.parcels.findIndex((p) => p._id === parcelId);
  if (idx === -1) return false;
  const p = db.parcels[idx];
  const parcelCarrier = p.currentCarrier?._id || p.currentCarrier;
  if (parcelCarrier && parcelCarrier !== carrierId) return false;
  db.parcels.splice(idx, 1);
  save(db);
  return true;
}

export function scanParcel(trackingNumber, carrierId, lat, lng) {
  const db = getDb();
  const parcel = db.parcels.find((p) => p.trackingNumber === trackingNumber);
  if (!parcel) return null;
  const prevCarrier = parcel.currentCarrier;
  parcel.currentCarrier = carrierId;
  parcel.status = 'in_transit';
  if (lat != null && lng != null) parcel.currentLocation = { lat, lng };
  parcel.updatedAt = new Date().toISOString();

  if (prevCarrier && prevCarrier !== carrierId) {
    const prevSeg = (parcel.routeSegments || []).find(
      (s) => s.carrierId === prevCarrier && s.status === 'active'
    );
    if (prevSeg) {
      prevSeg.status = 'completed';
      prevSeg.toLabel = `Handoff at ${lat?.toFixed(4) || '?'}, ${lng?.toFixed(4) || '?'}`;
    }
  }
  save(db);
  return parcel;
}

export function completeRouteSegment(parcelId, carrierId) {
  const db = getDb();
  const parcel = db.parcels.find((p) => p._id === parcelId);
  if (!parcel) return null;
  const seg = (parcel.routeSegments || []).find(
    (s) => s.carrierId === carrierId && s.status === 'active'
  );
  if (!seg) return null;
  seg.status = 'completed';
  seg.toLabel = parcel.currentLocation
    ? `${parcel.currentLocation.lat.toFixed(4)}, ${parcel.currentLocation.lng.toFixed(4)}`
    : 'Handoff point';
  parcel.updatedAt = new Date().toISOString();
  save(db);
  return parcel;
}

export function getSimulationSegments(trackingNumber) {
  const db = getDb();
  const parcel = db.parcels.find((p) => p.trackingNumber === trackingNumber);
  return parcel?.simulationSegments || [];
}

export function saveSimulationRoute(trackingNumber, carrierId, carrierName, waypoints, routeGeometry) {
  const db = getDb();
  const parcel = db.parcels.find((p) => p.trackingNumber === trackingNumber);
  if (!parcel) return null;

  parcel.simulationSegments = (parcel.simulationSegments || []).filter(
    (s) => !(s.carrierId === carrierId && s.status === 'planned')
  );

  const CARRIER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4'];
  const used = parcel.simulationSegments.map((s) => s.color).filter(Boolean);
  const color = CARRIER_COLORS.find((c) => !used.includes(c)) || CARRIER_COLORS[parcel.simulationSegments.length % CARRIER_COLORS.length];

  parcel.simulationSegments.push({
    carrierId,
    carrierName: carrierName || 'Unknown',
    color,
    waypoints,
    routeGeometry: routeGeometry || [],
    status: 'planned',
  });
  parcel.updatedAt = new Date().toISOString();
  save(db);
  return parcel;
}

export function startSimulation(trackingNumber, carrierId) {
  const db = getDb();
  const parcel = db.parcels.find((p) => p.trackingNumber === trackingNumber);
  if (!parcel) return null;
  const seg = (parcel.simulationSegments || []).find(
    (s) => s.carrierId === carrierId && s.status === 'planned'
  );
  if (!seg) return null;
  seg.status = 'active';
  parcel.status = 'in_transit';
  parcel.currentCarrier = carrierId;
  if (seg.waypoints?.length > 0) {
    parcel.currentLocation = { lat: seg.waypoints[0].lat, lng: seg.waypoints[0].lng };
  }
  parcel.updatedAt = new Date().toISOString();
  save(db);
  return { parcel, segment: seg };
}

export function stopSimulation(trackingNumber, carrierId) {
  const db = getDb();
  const parcel = db.parcels.find((p) => p.trackingNumber === trackingNumber);
  if (!parcel) return null;
  const seg = (parcel.simulationSegments || []).find(
    (s) => s.carrierId === carrierId && s.status === 'active'
  );
  if (seg) {
    seg.status = 'completed';
    if (seg.waypoints?.length > 0) {
      const last = seg.waypoints[seg.waypoints.length - 1];
      parcel.currentLocation = { lat: last.lat, lng: last.lng };
    }
  }
  parcel.updatedAt = new Date().toISOString();
  save(db);
  return parcel;
}
