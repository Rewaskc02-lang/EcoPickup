const mongoose = require('mongoose');

/**
 * PickupRequest Schema:
 * Represents an e-waste collection request initiated by a citizen,
 * tracked through field collection, centre weigh-in, and recycling.
 */
const pickupRequestSchema = new mongoose.Schema(
  {
    // Reference to the citizen user who created the pickup request
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Citizen reference is required']
    },
    // Reference to the e-waste category of items being submitted
    itemCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemCategory',
      required: [true, 'Item category is required']
    },
    // Number of individual items being scheduled for disposal
    quantity: {
      type: Number,
      required: [true, 'Please provide the quantity of items'],
      min: [1, 'Quantity must be at least 1']
    },
    // Citizen's estimated total weight in kilograms
    approxWeightKg: {
      type: Number,
      required: [true, 'Please provide the approximate weight in kg'],
      min: [0.1, 'Weight must be greater than 0']
    },
    // Full physical pickup street address provided by the citizen
    address: {
      type: String,
      required: [true, 'Pickup address is required'],
      trim: true
    },
    // Locality or operational zone string used for route planning and area-wise analytics
    area: {
      type: String,
      required: [true, 'Area or locality zone is required'],
      trim: true
    },
    // Date requested by the citizen for collection pickup
    preferredDate: {
      type: Date,
      required: [true, 'Preferred pickup date is required']
    },
    // This is the core state machine of the whole app: Requested -> Scheduled -> Collected -> Recycled, or Requested -> Rejected. Citizens create at 'Requested'; admin moves it to 'Scheduled' when assigning an agent; the agent moves it through 'Collected' and eventually 'Recycled' from the field.
    status: {
      type: String,
      enum: ['Requested', 'Scheduled', 'Collected', 'Recycled', 'Rejected'],
      default: 'Requested',
      required: true
    },
    // Reference to the collection agent assigned by admin to collect items
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // Reference to the destination collection centre where e-waste is processed
    collectionCentre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CollectionCentre',
      default: null
    },
    // Actual measured weight recorded by the agent/admin upon physical collection
    actualWeightKg: {
      type: Number,
      default: null
    },
    // Total reward points credited to the citizen once status is set to Recycled
    rewardPointsEarned: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const PickupRequest = mongoose.model('PickupRequest', pickupRequestSchema);

module.exports = PickupRequest;
