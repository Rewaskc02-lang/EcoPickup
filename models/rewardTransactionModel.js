const mongoose = require('mongoose');

/**
 * RewardTransaction Schema:
 * Records every reward point ledger movement (earned on recycling or redeemed in wallet).
 */
const rewardTransactionSchema = new mongoose.Schema(
  {
    // Reference to the citizen user receiving or spending points
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    // Transaction type: earned upon completed recycling, or redeemed for vouchers/coupons
    type: {
      type: String,
      enum: ['earned', 'redeemed'],
      required: [true, 'Transaction type is required']
    },
    // Exact number of reward points credited or debited
    points: {
      type: Number,
      required: [true, 'Points value is required']
    },
    // Optional reference to the PickupRequest that triggered this transaction
    relatedRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PickupRequest',
      default: null
    },
    // Human-readable ledger summary describing the recycling or redemption item
    description: {
      type: String,
      trim: true
    },
    // Timestamp of the ledger event
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const RewardTransaction = mongoose.model('RewardTransaction', rewardTransactionSchema);

module.exports = RewardTransaction;
