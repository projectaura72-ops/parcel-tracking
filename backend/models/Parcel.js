const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
}, { _id: false });

const segmentPointSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const routeSegmentSchema = new mongoose.Schema({
  carrierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  carrierName: { type: String },
  color: { type: String },
  points: [segmentPointSchema],
}, { _id: false });

const parcelSchema = new mongoose.Schema({
  trackingNumber: { type: String, required: true, unique: true },
  qrCode: { type: String },
  name: { type: String, required: true },
  description: { type: String },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentCarrier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['pending', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending',
  },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  currentLocation: locationSchema,
  routeSegments: [routeSegmentSchema],
  estimatedDelivery: { type: Date },
  deliveredAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Parcel', parcelSchema);
