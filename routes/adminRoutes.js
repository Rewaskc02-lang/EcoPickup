const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Authenticate and restrict all routes in this router to 'admin' role
router.use(requireAuth);
router.use(requireRole('admin'));

// Admin Dashboard
router.get('/', dashboardController.adminDashboard);
router.get('/dashboard', dashboardController.adminDashboard);

// Request Queue & State Machine (Approve & Assign, Reject)
router.get('/requests', adminController.listPendingRequests);
router.post('/requests/approve/:id', adminController.approveAndAssign);
router.post('/requests/reject/:id', adminController.rejectRequest);

// Item Categories Management (CRUD)
router.get('/categories', adminController.listCategories);
router.get('/categories/add', adminController.showAddCategoryForm);
router.post('/categories', adminController.createCategory);
router.get('/categories/edit/:id', adminController.showEditCategoryForm);
router.post('/categories/edit/:id', adminController.updateCategory);

// Collection Centres Management (CRUD)
router.get('/centres', adminController.listCentres);
router.get('/centres/add', adminController.showAddCentreForm);
router.post('/centres', adminController.createCentre);
router.get('/centres/edit/:id', adminController.showEditCentreForm);
router.post('/centres/edit/:id', adminController.updateCentre);
router.post('/centres/delete/:id', adminController.deleteCentre);
router.get('/centres/delete/:id', adminController.deleteCentre);

module.exports = router;
