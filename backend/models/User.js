const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin', 'carrier', 'owner'], default: 'owner' },
  phone: { type: String },
  avatar: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
