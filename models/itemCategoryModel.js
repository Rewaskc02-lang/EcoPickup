const mongoose = require('mongoose');

/**
 * ItemCategory Schema:
 * Defines the classification of recyclable electronic waste items
 * along with their reward conversion rates.
 */
const itemCategorySchema = new mongoose.Schema(
  {
    // Category name (e.g., Mobiles, Batteries, Appliances, Cables) to classify e-waste type
    name: {
      type: String,
      required: [true, 'Please provide a category name'],
      unique: true,
      trim: true
    },
    // Reward points awarded per kilogram of recycled material in this category
    rewardPointsPerKg: {
      type: Number,
      required: [true, 'Please specify reward points per kg'],
      min: [0, 'Reward points cannot be negative']
    },
    // Description of acceptable e-waste products and recycling notes for this category
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const ItemCategory = mongoose.model('ItemCategory', itemCategorySchema);

module.exports = ItemCategory;
