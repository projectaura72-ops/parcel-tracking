const admin = require('../services/firebase');
const User = require('../models/User');

async function verifyFirebaseToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUid = decoded.uid;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message, err.code);
    res.status(401).json({ message: 'Invalid token', error: err.message });
  }
}

async function verifyToken(req, res, next) {
  await verifyFirebaseToken(req, res, async () => {
    req.user = await User.findOne({ firebaseUid: req.firebaseUid });
    if (!req.user) {
      return res.status(404).json({ message: 'User not found' });
    }
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

module.exports = { verifyToken, verifyFirebaseToken, requireRole };
