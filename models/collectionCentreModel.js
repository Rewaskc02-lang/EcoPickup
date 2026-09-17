const mongoose = require('mongoose');

/**
 * CollectionCentre Schema:
 * Represents physical recycling hub facilities where agents deliver collected e-waste.
 */
const collectionCentreSchema = new mongoose.Schema(
  {
    // Facility name of the collection and recycling centre
    name: {
      type: String,
      required: [true, 'Collection centre name is required'],
      trim: true
    },
    // Complete physical street address of the facility
    address: {
      type: String,
      required: [true, 'Facility address is required'],
      trim: true
    },
    // Locality zone where the centre operates
    area: {
      type: String,
      required: [true, 'Facility area or zone is required'],
      trim: true
    },
    // Phone contact for centre supervisor and logistics coordination
    contactNumber: {
      type: String,
      trim: true
    },
    // Maximum storage and processing capacity in kilograms
    capacityKg: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const CollectionCentre = mongoose.model('CollectionCentre', collectionCentreSchema);

module.exports = CollectionCentre;
