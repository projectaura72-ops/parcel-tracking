const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const carrierController = require('../controllers/carrierController');

router.get('/profile', verifyToken, carrierController.getCarrierProfile);
router.patch('/location', verifyToken, carrierController.updateLocation);
router.patch('/toggle-online', verifyToken, carrierController.toggleOnline);
router.post('/scan', verifyToken, carrierController.scanParcel);
router.get('/parcels', verifyToken, carrierController.getAssignedParcels);

module.exports = router;
