const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");
const asyncHandler = require("../utils/asyncHandler");
const { adminAuth } = require("../middlewares/auth");

// Admin authentication middleware
router.use(adminAuth);

// Get all coupons with pagination and filtering
router.get(
  "/coupons",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};

    // Apply filters if provided
    if (req.query.role) filter.role = req.query.role;
    if (req.query.minFollowers)
      filter.followers = { $gte: parseInt(req.query.minFollowers) };
    if (req.query.username)
      filter.username = { $regex: req.query.username, $options: "i" };

    const [coupons, total] = await Promise.all([
      Coupon.find(filter)
        .sort({ createdAt: -1 }) // Most recent first
        .skip(skip)
        .limit(limit)
        .select("-__v"),
      Coupon.countDocuments(filter),
    ]);

    res.json({
      status: "success",
      data: {
        coupons,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      },
    });
  })
);

// Get system statistics
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const [
      totalCoupons,
      creatorCoupons,
      userCoupons,
      totalRedeemedCount,
      mostUsedCoupon,
    ] = await Promise.all([
      Coupon.countDocuments(),
      Coupon.countDocuments({ role: "creator" }),
      Coupon.countDocuments({ role: "user" }),
      Coupon.aggregate([
        { $group: { _id: null, total: { $sum: "$timesUsed" } } },
      ]),
      Coupon.findOne()
        .sort({ timesUsed: -1, points: -1 })
        .select("couponCode username twitterId timesUsed points"),
    ]);

    const totalRedeemed = totalRedeemedCount[0]?.total || 0;

    res.json({
      status: "success",
      data: {
        totalCoupons,
        roleDistribution: {
          creators: creatorCoupons,
          users: userCoupons,
        },
        totalRedeemed,
        mostUsedCoupon: mostUsedCoupon || null,
        // Removed coupon limit counter since we no longer have a hard limit
      },
    });
  })
);

// Delete a coupon
router.delete(
  "/coupon/:couponId",
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.findByIdAndDelete(req.params.couponId);

    if (!coupon) {
      return res.status(404).json({
        status: "error",
        message: "Coupon not found",
      });
    }

    res.json({
      status: "success",
      message: "Coupon deleted successfully",
    });
  })
);

module.exports = router;
