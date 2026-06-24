const admin = require('firebase-admin');
const config = require('../config');

const serviceAccount = require(config.firebaseServiceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
