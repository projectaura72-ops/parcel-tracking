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
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  fromLabel: { type: String },
  toLabel: { type: String },
}, { _id: false });

const simulationWaypointSchema = new mongoose.Schema({
  label: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  transportMode: { type: String, enum: ['truck', 'ship', 'plane'], default: 'truck' },
}, { _id: false });

const routePointSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
}, { _id: false });

const simulationSegmentSchema = new mongoose.Schema({
  carrierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  carrierName: { type: String },
  color: { type: String },
  waypoints: [simulationWaypointSchema],
  routeGeometry: [routePointSchema],
  status: { type: String, enum: ['planned', 'active', 'completed'], default: 'planned' },
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
  simulationSegments: [simulationSegmentSchema],
  estimatedDelivery: { type: Date },
  deliveredAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Parcel', parcelSchema);
