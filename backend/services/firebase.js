const admin = require('firebase-admin');
const config = require('../config');

const hasProjectId = !!config.firebase.projectId;
const hasPrivateKey = !!config.firebase.privateKey;
const hasClientEmail = !!config.firebase.clientEmail;
console.log('Firebase config:', { hasProjectId, hasPrivateKey, hasClientEmail, projectId: config.firebase.projectId });

const credential = admin.cert({
  projectId: config.firebase.projectId,
  privateKey: config.firebase.privateKey,
  clientEmail: config.firebase.clientEmail,
});

admin.initializeApp({ credential });

module.exports = admin;
