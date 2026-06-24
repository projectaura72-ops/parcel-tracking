const Parcel = require('../models/Parcel');
const TrackingHistory = require('../models/TrackingHistory');

function resolveUserId(req) {
  return req.headers['x-sim-carrier-id'] || req.user._id;
}

exports.getCarrierProfile = async (req, res, next) => {
  try {
    const parcels = await Parcel.find({
      $or: [
        { currentCarrier: req.user._id },
        { 'routeSegments.carrierId': req.user._id },
      ],
    }).populate('ownerId', 'name email');

    res.json({ parcels });
  } catch (err) {
    next(err);
  }
};

exports.scanParcel = async (req, res, next) => {
  try {
    const { trackingNumber, lat, lng } = req.body;
    const userId = resolveUserId(req);
    const parcel = await Parcel.findOne({ trackingNumber });

    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });
    if (parcel.status === 'delivered') return res.status(400).json({ message: 'Parcel already delivered' });

    const hasActiveSegment = parcel.routeSegments?.some(
      (s) => s.carrierId && s.status === 'active'
    );
    if (hasActiveSegment) {
      const activeCarrier = parcel.routeSegments.find((s) => s.status === 'active');
      if (activeCarrier && activeCarrier.carrierId.toString() !== userId.toString()) {
        return res.status(400).json({ message: 'Parcel is still with the current carrier. Wait for them to complete their segment.' });
      }
    }

    const previousCarrierId = parcel.currentCarrier;
    parcel.currentCarrier = userId;
    parcel.status = 'in_transit';
    if (lat && lng) parcel.currentLocation = { lat, lng };
    await parcel.save();

    if (previousCarrierId && previousCarrierId.toString() !== userId.toString()) {
      const prevSegment = parcel.routeSegments.find(
        (s) => s.carrierId && s.carrierId.toString() === previousCarrierId.toString() && s.status === 'active'
      );
      if (prevSegment) {
        prevSegment.status = 'completed';
        prevSegment.toLabel = `Handoff at ${lat?.toFixed(4) || '?'}, ${lng?.toFixed(4) || '?'}`;
        await parcel.save();
      }
    }

    await TrackingHistory.create({
      parcelId: parcel._id,
      carrierId: userId,
      status: 'in_transit',
      location: lat && lng ? { lat, lng } : undefined,
      message: `Carrier claimed parcel${previousCarrierId ? ' (handoff)' : ''}`,
    });

    res.json(parcel);
  } catch (err) {
    next(err);
  }
};

exports.getAssignedParcels = async (req, res, next) => {
  try {
    const userId = req.query.simCarrierId || req.user._id;
    const parcels = await Parcel.find({
      $or: [
        { currentCarrier: userId },
        { 'routeSegments.carrierId': userId },
      ],
    })
      .populate('ownerId', 'name email')
      .populate('currentCarrier', 'name email')
      .sort('-createdAt');

    res.json(parcels);
  } catch (err) {
    next(err);
  }
};

exports.completeSegment = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    const parcel = await Parcel.findById(req.params.parcelId);
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });

    const segment = parcel.routeSegments.find(
      (s) => s.carrierId && s.carrierId.toString() === userId.toString() && s.status === 'active'
    );
    if (!segment) return res.status(400).json({ message: 'No active segment found for this carrier' });

    segment.status = 'completed';
    segment.toLabel = parcel.currentLocation
      ? `${parcel.currentLocation.lat.toFixed(4)}, ${parcel.currentLocation.lng.toFixed(4)}`
      : 'Handoff point';
    await parcel.save();

    await TrackingHistory.create({
      parcelId: parcel._id,
      carrierId: userId,
      status: 'in_transit',
      location: parcel.currentLocation,
      message: 'Carrier completed their segment',
    });

    res.json(parcel);
  } catch (err) {
    next(err);
  }
};
