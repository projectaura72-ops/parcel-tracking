const User = require('../models/User');

exports.register = async (req, res, next) => {
  try {
    const { name, email, role } = req.body;
    const existing = await User.findOne({ firebaseUid: req.firebaseUid });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ firebaseUid: req.firebaseUid, name, email, role });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res) => {
  res.json(req.user);
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.getCarriers = async (req, res, next) => {
  try {
    const carriers = await User.find({ role: 'carrier' });
    res.json(carriers);
  } catch (err) {
    next(err);
  }
};
