const mongoose = require('mongoose');
const ItemCategory = require('../models/itemCategoryModel');

// Seed starter item categories if none exist in the database
const seedStarterCategories = async () => {
  try {
    const count = await ItemCategory.countDocuments();
    if (count === 0) {
      const starterCategories = [
        {
          name: 'Batteries',
          rewardPointsPerKg: 200,
          description: 'Lithium-ion, lead-acid, and dry cell batteries requiring safe handling due to hazardous contents.'
        },
        {
          name: 'Mobiles',
          rewardPointsPerKg: 150,
          description: 'Smartphones, feature phones, tablets, and handheld electronics containing precious metals.'
        },
        {
          name: 'Appliances',
          rewardPointsPerKg: 50,
          description: 'Microwaves, toasters, televisions, vacuum cleaners, and small household electronics.'
        },
        {
          name: 'Cables',
          rewardPointsPerKg: 40,
          description: 'Chargers, power cords, HDMI/USB cables, network wires, and plastic-insulated wiring.'
        }
      ];

      await ItemCategory.insertMany(starterCategories);
      console.log('✅ Seeded 4 default item categories (Batteries, Mobiles, Appliances, Cables)');
    }
  } catch (error) {
    console.error('Category seeding error:', error.message);
  }
};

const connectDB = async () => {
  try {
    // MONGO_URI points at a MongoDB Atlas cluster, not localhost — get the exact
    // connection string from Atlas > Connect > Drivers, and make sure the current
    // IP is allow-listed under Atlas > Network Access, or the connection will hang
    // and time out rather than fail immediately.
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Atlas connected: ewasteDB');

    // Run category seeder after connection
    await seedStarterCategories();

    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // Don't exit the process on failure so server stays alive and informs developer
  }
};

module.exports = connectDB;
