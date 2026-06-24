const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
}, { _id: false });

const routePointSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
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
  route: [routePointSchema],
  estimatedDelivery: { type: Date },
  deliveredAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Parcel', parcelSchema);
