const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    couponCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
    },
    twitterId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    followers: {
      type: Number,
      required: true,
      min: 1000,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    timesUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    role: {
      type: String,
      enum: ["creator", "user"],
      default: "user",
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    hasRedeemedCoupon: {
      type: Boolean,
      default: false,
      index: true,
    },
    redeemedCouponId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // Adds updatedAt field automatically
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Pre-save hook to validate followers count
couponSchema.pre("save", function (next) {
  if (this.isNew && this.followers < 1000) {
    const error = new Error("Minimum 1000 followers required");
    return next(error);
  }
  next();
});

// Add a method to update last used timestamp
couponSchema.methods.markAsUsed = function () {
  this.lastUsedAt = new Date();
  this.timesUsed += 1;
  return this.save();
};

// Static method to find coupons by role and minimum followers
couponSchema.statics.findByRoleAndMinFollowers = function (role, minFollowers) {
  return this.find({
    role,
    followers: { $gte: minFollowers },
    active: true,
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model("Coupon", couponSchema);
