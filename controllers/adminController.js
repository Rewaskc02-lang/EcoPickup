const User = require('../models/userModel');
const PickupRequest = require('../models/pickupRequestModel');
const ItemCategory = require('../models/itemCategoryModel');
const CollectionCentre = require('../models/collectionCentreModel');

/**
 * getDashboard:
 * Gathers overarching system statistics (total requests, pending approvals, categories, centres, agents)
 * and renders the operational admin dashboard.
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const totalRequests = await PickupRequest.countDocuments();
    const pendingRequests = await PickupRequest.countDocuments({ status: 'Requested' });
    const scheduledRequests = await PickupRequest.countDocuments({ status: 'Scheduled' });
    const completedRequests = await PickupRequest.countDocuments({ status: 'Recycled' });
    const totalCategories = await ItemCategory.countDocuments();
    const totalCentres = await CollectionCentre.countDocuments();
    const totalAgents = await User.countDocuments({ role: 'agent' });
    const totalCitizens = await User.countDocuments({ role: 'citizen' });

    const recentRequests = await PickupRequest.find()
      .populate('citizen', 'name email')
      .populate('itemCategory', 'name')
      .populate('assignedAgent', 'name')
      .sort({ createdAt: -1 })
      .limit(6);

    res.render('admin/dashboard', {
      pageTitle: 'Admin Dashboard',
      activeNav: 'dashboard',
      user: user || req.user,
      stats: {
        totalRequests,
        pendingRequests,
        scheduledRequests,
        completedRequests,
        totalCategories,
        totalCentres,
        totalAgents,
        totalCitizens
      },
      recentRequests
    });
  } catch (error) {
    next(error);
  }
};

/**
 * listPendingRequests:
 * Queries all PickupRequest documents with status "Requested", populates citizen and itemCategory,
 * and fetches active agents and collection centres to supply the assignment forms in requestQueue.ejs.
 */
exports.listPendingRequests = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const requests = await PickupRequest.find({ status: 'Requested' })
      .populate('citizen', 'name email phone address')
      .populate('itemCategory', 'name rewardPointsPerKg')
      .sort({ preferredDate: 1 });

    const agents = await User.find({ role: 'agent' }).sort({ name: 1 });
    const centres = await CollectionCentre.find().sort({ name: 1 });

    res.render('admin/requestQueue', {
      pageTitle: 'Pickup Request Queue',
      activeNav: 'requests',
      user: user || req.user,
      requests,
      agents,
      centres,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * approveAndAssign:
 * This is the one moment an admin turns a raw citizen request into actual field work.
 * Assigns an authorized field agent and target collection centre to a request and transitions status to "Scheduled".
 */
exports.approveAndAssign = async (req, res, next) => {
  try {
    const { assignedAgent, collectionCentre } = req.body;

    if (!assignedAgent) {
      return res.redirect('/admin/requests');
    }

    await PickupRequest.findByIdAndUpdate(req.params.id, {
      status: 'Scheduled',
      assignedAgent,
      collectionCentre: collectionCentre || null
    });

    res.redirect('/admin/requests');
  } catch (error) {
    next(error);
  }
};

/**
 * rejectRequest:
 * Transitions a raw pickup request to "Rejected" status if unserviceable or invalid.
 */
exports.rejectRequest = async (req, res, next) => {
  try {
    await PickupRequest.findByIdAndUpdate(req.params.id, {
      status: 'Rejected'
    });

    res.redirect('/admin/requests');
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ITEM CATEGORY MANAGEMENT (CRUD)
// ==========================================

/**
 * listCategories:
 * Displays all item categories along with their reward point exchange rates and descriptions.
 */
exports.listCategories = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const categories = await ItemCategory.find().sort({ name: 1 });

    res.render('admin/categories', {
      pageTitle: 'Item Categories',
      activeNav: 'categories',
      user: user || req.user,
      categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * showAddCategoryForm:
 * Renders the form to create a new recyclable item category.
 */
exports.showAddCategoryForm = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.render('admin/categoryForm', {
      pageTitle: 'Add New Category',
      activeNav: 'categories',
      user: user || req.user,
      category: null,
      isEdit: false,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * createCategory:
 * Handles submission of a new category name, rewardPointsPerKg, and description.
 */
exports.createCategory = async (req, res, next) => {
  try {
    const { name, rewardPointsPerKg, description } = req.body;

    if (!name || !rewardPointsPerKg) {
      const user = await User.findById(req.user.id);
      return res.render('admin/categoryForm', {
        pageTitle: 'Add New Category',
        activeNav: 'categories',
        user: user || req.user,
        category: { name, rewardPointsPerKg, description },
        isEdit: false,
        error: 'Please fill in the category name and reward points per kg.'
      });
    }

    await ItemCategory.create({
      name: name.trim(),
      rewardPointsPerKg: Number(rewardPointsPerKg),
      description: description ? description.trim() : ''
    });

    res.redirect('/admin/categories');
  } catch (error) {
    const user = await User.findById(req.user.id);
    return res.render('admin/categoryForm', {
      pageTitle: 'Add New Category',
      activeNav: 'categories',
      user: user || req.user,
      category: req.body,
      isEdit: false,
      error: error.message
    });
  }
};

/**
 * showEditCategoryForm:
 * Fetches an existing category by ID and renders the update form.
 */
exports.showEditCategoryForm = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const category = await ItemCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).render('error', {
        title: 'Category Not Found',
        statusCode: 404,
        message: 'The requested item category does not exist.'
      });
    }

    res.render('admin/categoryForm', {
      pageTitle: `Edit ${category.name}`,
      activeNav: 'categories',
      user: user || req.user,
      category,
      isEdit: true,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * updateCategory:
 * Updates the name, rewardPointsPerKg, and description of an existing category.
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, rewardPointsPerKg, description } = req.body;

    await ItemCategory.findByIdAndUpdate(req.params.id, {
      name: name.trim(),
      rewardPointsPerKg: Number(rewardPointsPerKg),
      description: description ? description.trim() : ''
    });

    res.redirect('/admin/categories');
  } catch (error) {
    const user = await User.findById(req.user.id);
    return res.render('admin/categoryForm', {
      pageTitle: 'Edit Category',
      activeNav: 'categories',
      user: user || req.user,
      category: { _id: req.params.id, ...req.body },
      isEdit: true,
      error: error.message
    });
  }
};

// ==========================================
// COLLECTION CENTRE MANAGEMENT (CRUD)
// ==========================================

/**
 * listCentres:
 * Lists all active collection and recycling centres in the network.
 */
exports.listCentres = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const centres = await CollectionCentre.find().sort({ name: 1 });

    res.render('admin/centres', {
      pageTitle: 'Collection Centres',
      activeNav: 'centres',
      user: user || req.user,
      centres
    });
  } catch (error) {
    next(error);
  }
};

/**
 * showAddCentreForm:
 * Renders form to register a new collection centre location.
 */
exports.showAddCentreForm = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.render('admin/centreForm', {
      pageTitle: 'Add Collection Centre',
      activeNav: 'centres',
      user: user || req.user,
      centre: null,
      isEdit: false,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * createCentre:
 * Handles submission of new collection centre details (name, address, area, contactNumber, capacityKg).
 */
exports.createCentre = async (req, res, next) => {
  try {
    const { name, address, area, contactNumber, capacityKg } = req.body;

    if (!name || !address || !area) {
      const user = await User.findById(req.user.id);
      return res.render('admin/centreForm', {
        pageTitle: 'Add Collection Centre',
        activeNav: 'centres',
        user: user || req.user,
        centre: { name, address, area, contactNumber, capacityKg },
        isEdit: false,
        error: 'Please fill in Name, Address, and Area fields.'
      });
    }

    await CollectionCentre.create({
      name: name.trim(),
      address: address.trim(),
      area: area.trim(),
      contactNumber: contactNumber ? contactNumber.trim() : '',
      capacityKg: capacityKg ? Number(capacityKg) : null
    });

    res.redirect('/admin/centres');
  } catch (error) {
    const user = await User.findById(req.user.id);
    return res.render('admin/centreForm', {
      pageTitle: 'Add Collection Centre',
      activeNav: 'centres',
      user: user || req.user,
      centre: req.body,
      isEdit: false,
      error: error.message
    });
  }
};

/**
 * showEditCentreForm:
 * Fetches a collection centre by ID and renders the update form.
 */
exports.showEditCentreForm = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const centre = await CollectionCentre.findById(req.params.id);

    if (!centre) {
      return res.status(404).render('error', {
        title: 'Centre Not Found',
        statusCode: 404,
        message: 'The requested collection centre does not exist.'
      });
    }

    res.render('admin/centreForm', {
      pageTitle: `Edit ${centre.name}`,
      activeNav: 'centres',
      user: user || req.user,
      centre,
      isEdit: true,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * updateCentre:
 * Updates the details of an existing collection centre.
 */
exports.updateCentre = async (req, res, next) => {
  try {
    const { name, address, area, contactNumber, capacityKg } = req.body;

    await CollectionCentre.findByIdAndUpdate(req.params.id, {
      name: name.trim(),
      address: address.trim(),
      area: area.trim(),
      contactNumber: contactNumber ? contactNumber.trim() : '',
      capacityKg: capacityKg ? Number(capacityKg) : null
    });

    res.redirect('/admin/centres');
  } catch (error) {
    const user = await User.findById(req.user.id);
    return res.render('admin/centreForm', {
      pageTitle: 'Edit Centre',
      activeNav: 'centres',
      user: user || req.user,
      centre: { _id: req.params.id, ...req.body },
      isEdit: true,
      error: error.message
    });
  }
};

/**
 * deleteCentre:
 * Removes a collection centre from the system catalogue.
 */
exports.deleteCentre = async (req, res, next) => {
  try {
    await CollectionCentre.findByIdAndDelete(req.params.id);
    res.redirect('/admin/centres');
  } catch (error) {
    next(error);
  }
};
