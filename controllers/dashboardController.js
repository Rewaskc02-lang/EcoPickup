const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const PickupRequest = require('../models/pickupRequestModel');
const ItemCategory = require('../models/itemCategoryModel');
const CollectionCentre = require('../models/collectionCentreModel');

/**
 * handleRootRedirect:
 * Redirects "/" based on the token cookie's role (or to /login if unauthenticated).
 */
exports.handleRootRedirect = (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    switch (decoded.role) {
      case 'admin':
        return res.redirect('/admin');
      case 'agent':
        return res.redirect('/agent');
      case 'citizen':
      default:
        return res.redirect('/citizen');
    }
  } catch (error) {
    res.clearCookie('token');
    return res.redirect('/login');
  }
};

/**
 * citizenDashboard:
 * Gathers user request metrics: total requests made, counts by status
 * (Requested/Scheduled/Collected/Recycled/Rejected), current rewardPoints balance,
 * and the 5 most recent requests. Renders views/citizen/dashboard.ejs.
 */
exports.citizenDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    const totalRequests = await PickupRequest.countDocuments({ citizen: req.user.id });
    const countRequested = await PickupRequest.countDocuments({ citizen: req.user.id, status: 'Requested' });
    const countScheduled = await PickupRequest.countDocuments({ citizen: req.user.id, status: 'Scheduled' });
    const countCollected = await PickupRequest.countDocuments({ citizen: req.user.id, status: 'Collected' });
    const countRecycled = await PickupRequest.countDocuments({ citizen: req.user.id, status: 'Recycled' });
    const countRejected = await PickupRequest.countDocuments({ citizen: req.user.id, status: 'Rejected' });

    const recentRequests = await PickupRequest.find({ citizen: req.user.id })
      .populate('itemCategory')
      .sort({ createdAt: -1 })
      .limit(5);

    res.render('citizen/dashboard', {
      pageTitle: 'Citizen Dashboard',
      activeNav: 'dashboard',
      user: user || req.user,
      stats: {
        totalRequests,
        countRequested,
        countScheduled,
        countCollected,
        countRecycled,
        countRejected,
        rewardPoints: user ? user.rewardPoints : 0
      },
      recentRequests
    });
  } catch (error) {
    next(error);
  }
};

/**
 * agentDashboard:
 * Gathers field agent metrics: pickups currently assigned ('Scheduled'),
 * count collected-but-not-yet-recycled ('Collected'), and count fully recycled this month.
 * Renders views/agent/dashboard.ejs.
 */
exports.agentDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    // Pickups currently assigned (awaiting pickup)
    const currentlyAssigned = await PickupRequest.countDocuments({
      assignedAgent: req.user.id,
      status: 'Scheduled'
    });

    // Pickups collected but not yet recycled
    const collectedPendingRecycling = await PickupRequest.countDocuments({
      assignedAgent: req.user.id,
      status: 'Collected'
    });

    // Pickups fully recycled this calendar month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const recycledThisMonth = await PickupRequest.countDocuments({
      assignedAgent: req.user.id,
      status: 'Recycled',
      updatedAt: { $gte: startOfMonth }
    });

    const pendingPickups = await PickupRequest.find({
      assignedAgent: req.user.id,
      status: { $in: ['Scheduled', 'Collected'] }
    })
      .populate('citizen', 'name phone address')
      .populate('itemCategory', 'name')
      .populate('collectionCentre', 'name area')
      .sort({ preferredDate: 1 })
      .limit(5);

    res.render('agent/dashboard', {
      pageTitle: 'Field Agent Dashboard',
      activeNav: 'dashboard',
      user: user || req.user,
      stats: {
        currentlyAssigned,
        collectedPendingRecycling,
        recycledThisMonth
      },
      pendingPickups
    });
  } catch (error) {
    next(error);
  }
};

/**
 * adminDashboard:
 * Executes system-wide Mongoose aggregations:
 * - Total requests overall
 * - Total weight collected (sum of actualWeightKg across all "Recycled" requests)
 * - Category-wise breakdown ($group by itemCategory, sum weight + count)
 * - Area-wise breakdown ($group by area, sum weight + count)
 * Renders views/admin/dashboard.ejs with simple percentage bar breakdowns.
 */
exports.adminDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    // 1. Total requests count
    const totalRequests = await PickupRequest.countDocuments();
    const pendingCount = await PickupRequest.countDocuments({ status: 'Requested' });
    const scheduledCount = await PickupRequest.countDocuments({ status: 'Scheduled' });
    const recycledCount = await PickupRequest.countDocuments({ status: 'Recycled' });

    // 2. Total recycled weight aggregate
    const weightResult = await PickupRequest.aggregate([
      { $match: { status: 'Recycled' } },
      { $group: { _id: null, totalWeight: { $sum: { $ifNull: ['$actualWeightKg', '$approxWeightKg'] } } } }
    ]);
    const totalWeightCollected = weightResult.length > 0 ? Math.round(weightResult[0].totalWeight * 10) / 10 : 0;

    // 3. Category-wise breakdown aggregation
    const categoryBreakdown = await PickupRequest.aggregate([
      {
        $group: {
          _id: '$itemCategory',
          count: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$actualWeightKg', '$approxWeightKg'] } }
        }
      },
      {
        $lookup: {
          from: 'itemcategories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          categoryName: { $ifNull: ['$categoryInfo.name', 'Uncategorized'] },
          count: 1,
          totalWeight: { $round: ['$totalWeight', 1] }
        }
      },
      { $sort: { totalWeight: -1, count: -1 } }
    ]);

    // 4. Area-wise breakdown aggregation
    const areaBreakdown = await PickupRequest.aggregate([
      {
        $group: {
          _id: '$area',
          count: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$actualWeightKg', '$approxWeightKg'] } }
        }
      },
      {
        $project: {
          areaName: '$_id',
          count: 1,
          totalWeight: { $round: ['$totalWeight', 1] }
        }
      },
      { $sort: { count: -1, totalWeight: -1 } }
    ]);

    // Recent requests
    const recentRequests = await PickupRequest.find()
      .populate('citizen', 'name email')
      .populate('itemCategory', 'name')
      .populate('assignedAgent', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.render('admin/dashboard', {
      pageTitle: 'Recycler Admin Dashboard',
      activeNav: 'dashboard',
      user: user || req.user,
      stats: {
        totalRequests,
        pendingCount,
        scheduledCount,
        recycledCount,
        totalWeightCollected
      },
      categoryBreakdown,
      areaBreakdown,
      recentRequests
    });
  } catch (error) {
    next(error);
  }
};
