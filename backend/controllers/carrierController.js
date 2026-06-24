const Carrier = require('../models/Carrier');
const Parcel = require('../models/Parcel');

exports.getCarrierProfile = async (req, res, next) => {
  try {
    let carrier = await Carrier.findOne({ userId: req.user._id })
      .populate('assignedParcels');

    if (!carrier) {
      carrier = await Carrier.create({ userId: req.user._id, carrierType: 'rider' });
    }

    res.json(carrier);
  } catch (err) {
    next(err);
  }
};

exports.updateLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    const carrier = await Carrier.findOneAndUpdate(
      { userId: req.user._id },
      { currentLocation: { lat, lng } },
      { new: true }
    );

    res.json(carrier);
  } catch (err) {
    next(err);
  }
};

exports.toggleOnline = async (req, res, next) => {
  try {
    const carrier = await Carrier.findOneAndUpdate(
      { userId: req.user._id },
      [{ $set: { isOnline: { $eq: [false, '$isOnline'] } } }],
      { new: true }
    );

    res.json(carrier);
  } catch (err) {
    next(err);
  }
};

exports.scanParcel = async (req, res, next) => {
  try {
    const { trackingNumber } = req.body;
    const parcel = await Parcel.findOne({ trackingNumber });

    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });

    parcel.currentCarrier = req.user._id;
    parcel.status = 'in_transit';
    await parcel.save();

    res.json(parcel);
  } catch (err) {
    next(err);
  }
};

exports.getAssignedParcels = async (req, res, next) => {
  try {
    const parcels = await Parcel.find({ currentCarrier: req.user._id })
      .populate('ownerId', 'name email');

    res.json(parcels);
  } catch (err) {
    next(err);
  }
};
