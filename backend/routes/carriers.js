const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const carrierController = require('../controllers/carrierController');

router.get('/profile', verifyToken, carrierController.getCarrierProfile);
router.post('/scan', verifyToken, carrierController.scanParcel);
router.get('/parcels', verifyToken, carrierController.getAssignedParcels);
router.post('/:parcelId/complete-segment', verifyToken, carrierController.completeSegment);

module.exports = router;
