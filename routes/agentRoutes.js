const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Authenticate and restrict all routes in this router to 'agent' role
router.use(requireAuth);
router.use(requireRole('agent'));

// Agent Dashboard
router.get('/', dashboardController.agentDashboard);
router.get('/dashboard', dashboardController.agentDashboard);

// Assigned Pickups & Field State Transitions
router.get('/pickups', agentController.listAssignedPickups);
router.post('/pickups/collect/:id', agentController.markCollected);
router.post('/pickups/recycle/:id', agentController.markRecycled);

module.exports = router;
