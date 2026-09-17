const express = require('express');
const router = express.Router();
const citizenController = require('../controllers/citizenController');
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Authenticate and restrict all routes in this router to 'citizen' role
router.use(requireAuth);
router.use(requireRole('citizen'));

// Citizen Dashboard routes
router.get('/', dashboardController.citizenDashboard);
router.get('/dashboard', dashboardController.citizenDashboard);

// Pickup Booking flow
router.get('/book', citizenController.showBookingForm);
router.post('/book', citizenController.createPickupRequest);

// My Requests & Track Status flow
router.get('/requests', citizenController.listMyRequests);
router.get('/requests/:id', citizenController.viewRequestDetail);

// Citizen Reward Wallet flow (Stretch Goal)
router.get('/wallet', citizenController.showWallet);
router.post('/wallet/redeem', citizenController.redeemPoints);

module.exports = router;
