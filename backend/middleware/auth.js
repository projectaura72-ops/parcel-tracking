const User = require('../models/User');

async function setMockUser(req, res, next) {
  const role = req.headers['x-mock-role'] || 'admin';
  let user = await User.findOne({ firebaseUid: `mock-${role}` });
  if (!user) {
    user = await User.create({
      firebaseUid: `mock-${role}`,
      name: `Mock ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      email: `mock-${role}@test.com`,
      role,
    });
  }
  req.firebaseUid = user.firebaseUid;
  req.user = user;
  next();
}

async function verifyFirebaseToken(req, res, next) {
  setMockUser(req, res, next);
}

async function verifyToken(req, res, next) {
  setMockUser(req, res, next);
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
