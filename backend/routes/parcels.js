const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const parcelController = require('../controllers/parcelController');

router.post('/', verifyToken, parcelController.createParcel);
router.get('/', verifyToken, parcelController.getMyParcels);
router.get('/all', verifyToken, requireRole('admin'), parcelController.getAllParcels);
router.get('/track/:trackingNumber', parcelController.getParcelByTrackingNumber);
router.get('/:id', verifyToken, parcelController.getParcelById);
router.patch('/:id/assign', verifyToken, requireRole('admin', 'owner'), parcelController.assignCarrier);

module.exports = router;
