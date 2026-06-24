const Parcel = require('../models/Parcel');
const TrackingHistory = require('../models/TrackingHistory');

const CARRIER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4'];

function getCarrierColor(segments, carrierId) {
  const used = segments.map((s) => s.color).filter(Boolean);
  const available = CARRIER_COLORS.find((c) => !used.includes(c));
  return available || CARRIER_COLORS[segments.length % CARRIER_COLORS.length];
}

exports.saveRoute = async (req, res, next) => {
  try {
    const { trackingNumber, waypoints } = req.body;
    const parcel = await Parcel.findOne({ trackingNumber });
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });

    parcel.simulationSegments = parcel.simulationSegments.filter(
      (s) => !(s.carrierId && s.carrierId.toString() === req.user._id.toString() && s.status === 'planned')
    );

    const color = getCarrierColor(parcel.simulationSegments, req.user._id);
    parcel.simulationSegments.push({
      carrierId: req.user._id,
      carrierName: req.user.name || 'Carrier',
      color,
      waypoints,
      status: 'planned',
    });

    await parcel.save();
    res.json(parcel);
  } catch (err) {
    next(err);
  }
};

exports.getRoute = async (req, res, next) => {
  try {
    const parcel = await Parcel.findOne({ trackingNumber: req.params.trackingNumber });
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });
    res.json(parcel.simulationSegments || []);
  } catch (err) {
    next(err);
  }
};

exports.startSimulation = async (req, res, next) => {
  try {
    const { trackingNumber } = req.body;
    const parcel = await Parcel.findOne({ trackingNumber });
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });

    const segment = parcel.simulationSegments.find(
      (s) => s.carrierId && s.carrierId.toString() === req.user._id.toString() && s.status === 'planned'
    );
    if (!segment) return res.status(400).json({ message: 'No planned route for this carrier' });
    if (!segment.waypoints || segment.waypoints.length < 2) {
      return res.status(400).json({ message: 'Route must have at least 2 waypoints' });
    }

    segment.status = 'active';
    parcel.status = 'in_transit';
    parcel.currentCarrier = req.user._id;
    parcel.currentLocation = {
      lat: segment.waypoints[0].lat,
      lng: segment.waypoints[0].lng,
    };
    await parcel.save();

    await TrackingHistory.create({
      parcelId: parcel._id,
      carrierId: req.user._id,
      status: 'in_transit',
      location: parcel.currentLocation,
      message: 'Simulation started',
    });

    res.json({ parcel, segment: segment.toObject() });
  } catch (err) {
    next(err);
  }
};

exports.stopSimulation = async (req, res, next) => {
  try {
    const { trackingNumber } = req.body;
    const parcel = await Parcel.findOne({ trackingNumber });
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });

    const segment = parcel.simulationSegments.find(
      (s) => s.carrierId && s.carrierId.toString() === req.user._id.toString() && s.status === 'active'
    );
    if (segment) {
      segment.status = 'completed';
      if (segment.waypoints.length > 0) {
        const last = segment.waypoints[segment.waypoints.length - 1];
        parcel.currentLocation = { lat: last.lat, lng: last.lng };
      }
    }

    await parcel.save();

    await TrackingHistory.create({
      parcelId: parcel._id,
      carrierId: req.user._id,
      status: 'in_transit',
      location: parcel.currentLocation,
      message: 'Simulation segment completed',
    });

    res.json(parcel);
  } catch (err) {
    next(err);
  }
};
