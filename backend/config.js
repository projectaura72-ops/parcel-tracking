require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI,
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },
  osrmBaseUrl: process.env.OSRM_BASE_URL || 'https://router.project-osrm.org',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
