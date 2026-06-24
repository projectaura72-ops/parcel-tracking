const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const simulationController = require('../controllers/simulationController');

router.post('/route', verifyToken, simulationController.saveRoute);
router.get('/route/:trackingNumber', verifyToken, simulationController.getRoute);
router.post('/start', verifyToken, simulationController.startSimulation);
router.post('/stop', verifyToken, simulationController.stopSimulation);

module.exports = router;
