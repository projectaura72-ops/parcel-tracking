const admin = require('firebase-admin');
const config = require('../config');

admin.initializeApp({
  credential: admin.cert({
    projectId: config.firebase.projectId,
    privateKey: config.firebase.privateKey,
    clientEmail: config.firebase.clientEmail,
  }),
});

module.exports = admin;
