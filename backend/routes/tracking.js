const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const trackingController = require('../controllers/trackingController');

router.get('/:parcelId', verifyToken, trackingController.getTrackingHistory);

module.exports = router;
