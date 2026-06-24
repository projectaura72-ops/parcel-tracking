const { v4: uuidv4 } = require('uuid');

function generateTrackingNumber() {
  const prefix = 'GT';
  const suffix = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
  return `${prefix}${suffix}`;
}

module.exports = { generateTrackingNumber };
