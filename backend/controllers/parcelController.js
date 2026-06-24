const Parcel = require('../models/Parcel');
const TrackingHistory = require('../models/TrackingHistory');
const { generateTrackingNumber } = require('../utils/generateTrackingNumber');

exports.createParcel = async (req, res, next) => {
  try {
    const { name, description, origin, destination, estimatedDelivery } = req.body;
    const trackingNumber = generateTrackingNumber();

    const parcel = await Parcel.create({
      trackingNumber,
      qrCode: trackingNumber,
      name,
      description,
      ownerId: req.user._id,
      origin,
      destination,
      estimatedDelivery,
    });

    await TrackingHistory.create({
      parcelId: parcel._id,
      status: 'pending',
      message: 'Parcel created',
    });

    res.status(201).json(parcel);
  } catch (err) {
    next(err);
  }
};

exports.getMyParcels = async (req, res, next) => {
  try {
    const query = req.user.role === 'owner'
      ? { ownerId: req.user._id }
      : { currentCarrier: req.user._id };

    const parcels = await Parcel.find(query)
      .populate('ownerId', 'name email')
      .populate('currentCarrier', 'name email')
      .sort('-createdAt');

    res.json(parcels);
  } catch (err) {
    next(err);
  }
};

exports.getParcelById = async (req, res, next) => {
  try {
    const parcel = await Parcel.findById(req.params.id)
      .populate('ownerId', 'name email')
      .populate('currentCarrier', 'name email');

    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });
    res.json(parcel);
  } catch (err) {
    next(err);
  }
};

exports.getParcelByTrackingNumber = async (req, res, next) => {
  try {
    const parcel = await Parcel.findOne({ trackingNumber: req.params.trackingNumber })
      .populate('ownerId', 'name email')
      .populate('currentCarrier', 'name email');

    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });

    const history = await TrackingHistory.find({ parcelId: parcel._id })
      .populate('carrierId', 'name email')
      .sort('timestamp');

    res.json({ parcel, history });
  } catch (err) {
    next(err);
  }
};

exports.assignCarrier = async (req, res, next) => {
  try {
    const { carrierId } = req.body;
    const parcel = await Parcel.findByIdAndUpdate(
      req.params.id,
      { currentCarrier: carrierId, status: 'in_transit' },
      { new: true }
    );

    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });

    await TrackingHistory.create({
      parcelId: parcel._id,
      carrierId,
      status: 'in_transit',
      message: 'Carrier assigned',
    });

    res.json(parcel);
  } catch (err) {
    next(err);
  }
};

exports.getAllParcels = async (req, res, next) => {
  try {
    const parcels = await Parcel.find()
      .populate('ownerId', 'name email')
      .populate('currentCarrier', 'name email')
      .sort('-createdAt');

    res.json(parcels);
  } catch (err) {
    next(err);
  }
};
