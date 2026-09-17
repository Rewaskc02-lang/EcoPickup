const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Roles Overview:
 * - "citizen": Books e-waste pickups, tracks requests, and earns reward points.
 * - "agent": Field collection agent who collects items and updates pickup status on the ground.
 * - "admin": Recycler / operations management team who approves requests, assigns agents,
 *   and manages item categories & collection centre catalogues.
 */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
      type: String,
      enum: ['citizen', 'agent', 'admin'],
      required: true,
      default: 'citizen'
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true // Citizen's default pickup address, optional
    },
    rewardPoints: {
      type: Number,
      default: 0 // Wallet balance, used in Phase 4
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to hash password before storing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password in database
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
