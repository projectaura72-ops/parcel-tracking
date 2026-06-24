const mongoose = require('mongoose');

const trackingHistorySchema = new mongoose.Schema({
  parcelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel', required: true },
  carrierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, required: true },
  location: {
    lat: { type: Number },
    lng: { type: Number },
  },
  message: { type: String },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TrackingHistory', trackingHistorySchema);
