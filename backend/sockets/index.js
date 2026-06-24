const TrackingHistory = require('../models/TrackingHistory');
const Parcel = require('../models/Parcel');

const userSockets = new Map();

function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('user:online', (userId) => {
      userSockets.set(userId, socket.id);
      socket.userId = userId;
    });

    socket.on('location:update', async (data) => {
      const { parcelId, lat, lng, carrierId } = data;

      try {
        const parcel = await Parcel.findByIdAndUpdate(
          parcelId,
          { currentLocation: { lat, lng }, status: 'in_transit' },
          { new: true }
        );

        if (!parcel) return;

        await TrackingHistory.create({
          parcelId,
          carrierId,
          status: 'in_transit',
          location: { lat, lng },
          message: `Location updated to [${lat}, ${lng}]`,
        });

        io.emit(`parcel:location:${parcelId}`, { lat, lng, parcelId });

        if (parcel.ownerId) {
          const ownerSocketId = userSockets.get(parcel.ownerId.toString());
          if (ownerSocketId) {
            io.to(ownerSocketId).emit('location:update', { parcelId, lat, lng });
          }
        }
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

        if (parcel.ownerId) {
          const ownerSocketId = userSockets.get(parcel.ownerId.toString());
          if (ownerSocketId) {
            io.to(ownerSocketId).emit('notification:new', {
              parcelId,
              status,
              message: message || `Parcel status updated to ${status}`,
            });
          }
        }
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
