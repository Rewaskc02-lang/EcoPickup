const User = require('../models/userModel');
const PickupRequest = require('../models/pickupRequestModel');
const ItemCategory = require('../models/itemCategoryModel');
const RewardTransaction = require('../models/rewardTransactionModel');

/**
 * getDashboard:
 * Renders the agent dashboard with statistics on assigned, collected, and delivered pickups.
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const assignedCount = await PickupRequest.countDocuments({
      assignedAgent: req.user.id,
      status: 'Scheduled'
    });

    const collectedCount = await PickupRequest.countDocuments({
      assignedAgent: req.user.id,
      status: 'Collected'
    });

    const completedCount = await PickupRequest.countDocuments({
      assignedAgent: req.user.id,
      status: 'Recycled'
    });

    const pendingPickups = await PickupRequest.find({
      assignedAgent: req.user.id,
      status: { $in: ['Scheduled', 'Collected'] }
    })
      .populate('citizen', 'name phone address')
      .populate('itemCategory', 'name')
      .sort({ preferredDate: 1 })
      .limit(5);

    res.render('agent/dashboard', {
      pageTitle: 'Agent Dashboard',
      activeNav: 'dashboard',
      user: user || req.user,
      assignedCount,
      collectedCount,
      completedCount,
      pendingPickups
    });
  } catch (error) {
    next(error);
  }
};

/**
 * listAssignedPickups:
 * Queries all PickupRequest documents assigned to the authenticated agent with status
 * in ['Scheduled', 'Collected'], populated with citizen and itemCategory details.
 */
exports.listAssignedPickups = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const pickups = await PickupRequest.find({
      assignedAgent: req.user.id,
      status: { $in: ['Scheduled', 'Collected'] }
    })
      .populate('citizen', 'name phone address email')
      .populate('itemCategory', 'name rewardPointsPerKg')
      .populate('collectionCentre', 'name address area')
      .sort({ preferredDate: 1 });

    res.render('agent/assignedPickups', {
      pageTitle: 'Assigned Pickups',
      activeNav: 'pickups',
      user: user || req.user,
      pickups,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * markCollected:
 * actualWeightKg may differ from the citizen's approxWeightKg estimate — this is the
 * number reward points get calculated from, not the estimate.
 * Sets the request status to "Collected" and stores the physical measured weight in kilograms.
 */
exports.markCollected = async (req, res, next) => {
  try {
    const { actualWeightKg } = req.body;

    if (!actualWeightKg || Number(actualWeightKg) <= 0) {
      return res.redirect('/agent/pickups');
    }

    await PickupRequest.findOneAndUpdate(
      { _id: req.params.id, assignedAgent: req.user.id },
      {
        status: 'Collected',
        actualWeightKg: Number(actualWeightKg)
      }
    );

    res.redirect('/agent/pickups');
  } catch (error) {
    next(error);
  }
};

/**
 * markRecycled:
 * This is the one place points actually get credited — everything
 * downstream (the wallet in Phase 4) just reads from RewardTransaction
 * and User.rewardPoints, it never recalculates points itself.
 * Sets status to "Recycled", calculates points based on actualWeightKg and category rate,
 * increments the citizen's wallet balance, and creates an audit RewardTransaction.
 */
exports.markRecycled = async (req, res, next) => {
  try {
    const pickup = await PickupRequest.findOne({
      _id: req.params.id,
      assignedAgent: req.user.id
    }).populate('itemCategory');

    if (!pickup) {
      return res.status(404).render('error', {
        title: 'Pickup Not Found',
        statusCode: 404,
        message: 'The requested pickup assignment could not be found.'
      });
    }

    const weight = pickup.actualWeightKg || pickup.approxWeightKg;
    const rate = (pickup.itemCategory && pickup.itemCategory.rewardPointsPerKg) ? pickup.itemCategory.rewardPointsPerKg : 50;
    const pointsCalculated = Math.round(weight * rate);

    // 1. Update pickup status and reward points
    pickup.status = 'Recycled';
    pickup.rewardPointsEarned = pointsCalculated;
    await pickup.save();

    // 2. Credit the citizen's wallet balance
    await User.findByIdAndUpdate(pickup.citizen, {
      $inc: { rewardPoints: pointsCalculated }
    });

    // 3. Create a RewardTransaction ledger record
    const categoryName = pickup.itemCategory ? pickup.itemCategory.name : 'E-Waste';
    await RewardTransaction.create({
      user: pickup.citizen,
      type: 'earned',
      points: pointsCalculated,
      relatedRequest: pickup._id,
      description: `Recycled ${weight}kg of ${categoryName}`
    });

    res.redirect('/agent/pickups');
  } catch (error) {
    next(error);
  }
};
