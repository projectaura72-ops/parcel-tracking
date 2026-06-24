const Parcel = require('../models/Parcel');

async function generateTrackingNumber() {
  for (let i = 0; i < 10; i++) {
    const num = Math.floor(10000 + Math.random() * 90000);
    const exists = await Parcel.findOne({ trackingNumber: String(num) });
    if (!exists) return String(num);
  }
  throw new Error('Could not generate unique tracking number');
}

module.exports = { generateTrackingNumber };
