const TrackingHistory = require('../models/TrackingHistory');
const Parcel = require('../models/Parcel');

const userSockets = new Map();
const CARRIER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4'];
const colorIndex = {};

function getCarrierColor(carrierId) {
  if (!colorIndex[carrierId]) {
    const used = Object.values(colorIndex);
    const available = CARRIER_COLORS.find((c) => !used.includes(c));
    colorIndex[carrierId] = available || CARRIER_COLORS[Object.keys(colorIndex).length % CARRIER_COLORS.length];
  }
  return colorIndex[carrierId];
}

async function addRoutePoint(parcelId, carrierId, carrierName, lat, lng) {
  const parcel = await Parcel.findById(parcelId);
  if (!parcel) return;

  let segment = parcel.routeSegments.find(
    (s) => s.carrierId && s.carrierId.toString() === carrierId
  );

  if (!segment) {
    const color = getCarrierColor(carrierId);
    segment = { carrierId, carrierName, color, points: [] };
    parcel.routeSegments.push(segment);
  }

  segment.points.push({ lat, lng, timestamp: new Date() });
  parcel.currentLocation = { lat, lng };
  await parcel.save();
}

function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('user:online', (userId) => {
      userSockets.set(userId, socket.id);
      socket.userId = userId;
    });

    socket.on('location:update', async (data) => {
      const { parcelId, lat, lng, carrierId } = data;
      const carrierName = data.carrierName || 'Unknown';

      try {
        await addRoutePoint(parcelId, carrierId || socket.userId, carrierName, lat, lng);

        await TrackingHistory.create({
          parcelId,
          carrierId: carrierId || socket.userId,
          status: 'in_transit',
          location: { lat, lng },
          message: `Location updated to [${lat}, ${lng}]`,
        });

        const payload = { lat, lng, parcelId };
        io.emit('location:update', payload);
        io.emit(`parcel:location:${parcelId}`, payload);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('parcel:status', async (data) => {
      const { parcelId, status, lat, lng, message } = data;

      try {
        const parcel = await Parcel.findByIdAndUpdate(
          parcelId,
          { status, ...(status === 'delivered' ? { deliveredAt: new Date() } : {}) },
          { new: true }
        );

        if (!parcel) return;

        await TrackingHistory.create({
          parcelId,
          carrierId: socket.userId,
          status,
          location: lat && lng ? { lat, lng } : undefined,
          message: message || `Status changed to ${status}`,
        });

        io.emit(`parcel:status:${parcelId}`, { parcelId, status, message });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('parcel:transfer', async (data) => {
      const { parcelId, newCarrierId, lat, lng } = data;

      try {
        const parcel = await Parcel.findByIdAndUpdate(
          parcelId,
          { currentCarrier: newCarrierId, currentLocation: { lat, lng } },
          { new: true }
        );

        if (!parcel) return;

        await TrackingHistory.create({
          parcelId,
          carrierId: newCarrierId,
          status: 'in_transit',
          location: { lat, lng },
          message: 'Parcel transferred to new carrier',
        });

        io.emit(`parcel:transfer:${parcelId}`, { parcelId, newCarrierId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        userSockets.delete(socket.userId);
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = setupSocket;
