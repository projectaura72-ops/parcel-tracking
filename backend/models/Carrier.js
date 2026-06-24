const mongoose = require('mongoose');

const carrierSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  carrierType: { type: String, enum: ['ship', 'truck', 'rider'], required: true },
  isOnline: { type: Boolean, default: false },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number },
  },
  vehicleNumber: { type: String },
  assignedParcels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Parcel' }],
}, { timestamps: true });

module.exports = mongoose.model('Carrier', carrierSchema);
