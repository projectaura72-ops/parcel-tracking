const path = require('path');
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI,
  firebaseServiceAccountPath:
    path.resolve(
      __dirname,
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '../parcel-tracking-320f5-firebase-adminsdk-fbsvc-a2b1777963.json'
    ),
  osrmBaseUrl: process.env.OSRM_BASE_URL || 'https://router.project-osrm.org',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
