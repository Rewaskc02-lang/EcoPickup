const User = require('../models/userModel');
const ItemCategory = require('../models/itemCategoryModel');
const PickupRequest = require('../models/pickupRequestModel');
const RewardTransaction = require('../models/rewardTransactionModel');

/**
 * getDashboard:
 * Fetches citizen profile and request metrics, or delegates to dashboardController.
 */
exports.getDashboard = async (req, res, next) => {
  const dashboardController = require('./dashboardController');
  return dashboardController.citizenDashboard(req, res, next);
};

/**
 * showBookingForm:
 * Fetches all available e-waste item categories and renders the booking form for citizen to schedule a pickup.
 */
exports.showBookingForm = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const categories = await ItemCategory.find().sort({ name: 1 });

    res.render('citizen/bookPickup', {
      pageTitle: 'Book a Pickup',
      activeNav: 'book',
      user: user || req.user,
      categories,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * createPickupRequest:
 * Reads form data, validates required parameters, creates a new PickupRequest with initial "Requested" status,
 * and redirects the citizen to their requests list.
 */
exports.createPickupRequest = async (req, res, next) => {
  try {
    const { itemCategory, quantity, approxWeightKg, address, area, preferredDate } = req.body;

    if (!itemCategory || !quantity || !approxWeightKg || !address || !area || !preferredDate) {
      const user = await User.findById(req.user.id);
      const categories = await ItemCategory.find().sort({ name: 1 });
      return res.render('citizen/bookPickup', {
        pageTitle: 'Book a Pickup',
        activeNav: 'book',
        user: user || req.user,
        categories,
        error: 'Please fill in all required fields.'
      });
    }

    await PickupRequest.create({
      citizen: req.user.id,
      itemCategory,
      quantity: Number(quantity),
      approxWeightKg: Number(approxWeightKg),
      address: address.trim(),
      area: area.trim(),
      preferredDate: new Date(preferredDate),
      status: 'Requested'
    });

    res.redirect('/citizen/requests');
  } catch (error) {
    next(error);
  }
};

/**
 * listMyRequests:
 * Queries all pickup requests initiated by the authenticated citizen, sorted newest first,
 * and populates item category and assigned agent details for status tracking.
 */
exports.listMyRequests = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const requests = await PickupRequest.find({ citizen: req.user.id })
      .populate('itemCategory')
      .populate('assignedAgent', 'name phone')
      .sort({ createdAt: -1 });

    res.render('citizen/myRequests', {
      pageTitle: 'My Requests',
      activeNav: 'requests',
      user: user || req.user,
      requests
    });
  } catch (error) {
    next(error);
  }
};

/**
 * viewRequestDetail:
 * Fetches a single request strictly scoped to the authenticated citizen to view comprehensive status progression,
 * collection schedule, and agent details securely.
 */
exports.viewRequestDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const request = await PickupRequest.findOne({
      _id: req.params.id,
      citizen: req.user.id
    })
      .populate('itemCategory')
      .populate('assignedAgent', 'name phone email')
      .populate('collectionCentre', 'name address area contactNumber');

    if (!request) {
      return res.status(404).render('error', {
        title: 'Request Not Found',
        statusCode: 404,
        message: 'The requested pickup record could not be found or you do not have permission to view it.'
      });
    }

    res.render('citizen/requestDetail', {
      pageTitle: `Request #${request._id.toString().slice(-6).toUpperCase()}`,
      activeNav: 'requests',
      user: user || req.user,
      request
    });
  } catch (error) {
    next(error);
  }
};

/**
 * showWallet:
 * Renders the citizen reward wallet showing the current points balance,
 * redemption options, and the complete RewardTransaction history (earned & redeemed), newest first.
 */
exports.showWallet = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const transactions = await RewardTransaction.find({ user: req.user.id })
      .populate('relatedRequest')
      .sort({ date: -1, createdAt: -1 });

    res.render('citizen/wallet', {
      pageTitle: 'My Reward Wallet',
      activeNav: 'wallet',
      user: user || req.user,
      transactions,
      error: null,
      success: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * redeemPoints:
 * This is a simulated redemption for demo purposes, not a real voucher/payment system.
 * Validates available rewardPoints, decrements the balance on the User doc,
 * and logs a new "redeemed" RewardTransaction.
 */
exports.redeemPoints = async (req, res, next) => {
  try {
    const { points, voucherName } = req.body;
    const pointsToRedeem = Number(points);

    if (!pointsToRedeem || pointsToRedeem <= 0) {
      return res.redirect('/citizen/wallet');
    }

    const user = await User.findById(req.user.id);

    if (!user || (user.rewardPoints || 0) < pointsToRedeem) {
      const transactions = await RewardTransaction.find({ user: req.user.id })
        .populate('relatedRequest')
        .sort({ date: -1, createdAt: -1 });

      return res.render('citizen/wallet', {
        pageTitle: 'My Reward Wallet',
        activeNav: 'wallet',
        user: user || req.user,
        transactions,
        error: 'Insufficient reward points balance for this redemption.',
        success: null
      });
    }

    // Decrement citizen's balance
    user.rewardPoints -= pointsToRedeem;
    await user.save();

    // Log the redemption in the RewardTransaction ledger
    const description = voucherName || `Redeemed ${pointsToRedeem} points for eco-voucher`;
    await RewardTransaction.create({
      user: user._id,
      type: 'redeemed',
      points: pointsToRedeem,
      description: description
    });

    res.redirect('/citizen/wallet');
  } catch (error) {
    next(error);
  }
};
