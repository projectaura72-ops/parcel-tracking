const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const authController = require('../controllers/authController');

router.post('/register', verifyToken, authController.register);
router.get('/me', verifyToken, authController.getMe);
router.get('/users', verifyToken, requireRole('admin'), authController.getAllUsers);
router.get('/carriers', verifyToken, authController.getCarriers);

module.exports = router;
