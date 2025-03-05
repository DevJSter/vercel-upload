const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");
const generateCouponCode = require("../utils/generateCouponCode");
const {
  validateGenerateCoupon,
  validateRedeemCoupon,
  validateGetCoupon,
} = require("../middlewares/validation");
const asyncHandler = require("../utils/asyncHandler");

// Generate Coupon
router.post(
  "/coupon",
  validateGenerateCoupon,
  asyncHandler(async (req, res) => {
    const { twitterId, username, followers, role } = req.body;

    // Check existing
    const existingCoupon = await Coupon.findOne({ twitterId });
    if (existingCoupon) {
      return res.status(409).json({
        status: "error",
        message: "User already has a coupon",
      });
    }

    // Note: We've removed the coupon limit to allow unlimited user onboarding
    // If you want to add a higher limit for system protection, you can set it here
    // Example for a much higher limit:
    // const couponCount = await Coupon.countDocuments();
    // if (couponCount >= 1000000) { // 1 million users
    //   return res.status(403).json({
    //     status: 'error',
    //     message: 'System capacity reached, please contact support'
    //   });
    // }

    // Create coupon
    const coupon = await Coupon.create({
      couponCode: generateCouponCode(twitterId),
      twitterId,
      username,
      followers,
      role: role || "user",
    });

    res.status(201).json({
      status: "success",
      data: {
        code: coupon.couponCode,
        username: coupon.username,
        role: coupon.role,
      },
    });
  })
);

// Get Coupon
router.get(
  "/coupon",
  validateGetCoupon,
  asyncHandler(async (req, res) => {
    const { twitterId } = req.query;

    const coupon = await Coupon.findOne({ twitterId }).select("-__v");

    if (!coupon) {
      return res.status(404).json({
        status: "error",
        message: "Coupon not found",
      });
    }

    res.json({
      status: "success",
      data: coupon,
    });
  })
);


// Redeem Coupon with new user support
router.post('/redeem', asyncHandler(async (req, res) => {
  const { redeemerTwitterId, username, followers, couponCode } = req.body;

  // Validate required fields
  if (!redeemerTwitterId || !couponCode) {
    return res.status(400).json({ 
      status: 'error',
      message: 'Twitter ID and coupon code are required' 
    });
  }

  // Find the coupon being redeemed
  const coupon = await Coupon.findOne({ couponCode });
  
  if (!coupon) {
    return res.status(404).json({ 
      status: 'error',
      message: 'Invalid coupon code' 
    });
  }

  // Check if redeemer is the coupon owner
  if (coupon.twitterId === redeemerTwitterId) {
    return res.status(400).json({ 
      status: 'error',
      message: 'Cannot redeem your own coupon' 
    });
  }

  // Find or create the redeemer's coupon
  let redeemer = await Coupon.findOne({ twitterId: redeemerTwitterId });
  let newCouponCreated = false;
  
  // Check if user has already redeemed a coupon before
  if (redeemer && redeemer.hasRedeemedCoupon) {
    return res.status(403).json({ 
      status: 'error',
      message: 'You have already redeemed a coupon before. Each user can only redeem one coupon.' 
    });
  }
  
  // If redeemer doesn't exist and we have username and followers, create a new coupon
  if (!redeemer) {
    // For new users, username and followers are required
    if (!username || !followers) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Username and followers count are required for new users' 
      });
    }
    
    // Validate followers count
    if (followers < 1000) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Minimum 1000 followers required' 
      });
    }
    
    // Create new coupon for the redeemer
    redeemer = await Coupon.create({
      couponCode: generateCouponCode(redeemerTwitterId),
      twitterId: redeemerTwitterId,
      username,
      followers,
      role: coupon.role, // Assign same role as the referrer
      points: 0 // Will add points below
    });
    
    newCouponCreated = true;
  }
  
  // Role validation
  if (coupon.role !== redeemer.role) {
    return res.status(403).json({ 
      status: 'error',
      message: 'Creator and redeemer must have the same role' 
    });
  }

  // Update points for both parties
  coupon.points += 10;
  redeemer.points += 10;
  coupon.timesUsed += 1;
  
  // Update last used timestamp
  coupon.lastUsedAt = new Date();
  
  // Mark that this user has redeemed a coupon
  redeemer.hasRedeemedCoupon = true;
  redeemer.redeemedCouponId = coupon.couponCode;
  
  // Save both documents
  await Promise.all([coupon.save(), redeemer.save()]);

  // Prepare response
  const response = {
    status: 'success',
    message: 'Coupon redeemed successfully',
    data: {
      creatorPoints: coupon.points,
      redeemerPoints: redeemer.points
    }
  };
  
  // Add new coupon information for new users
  if (newCouponCreated) {
    response.data.newUser = true;
    response.data.newCouponCode = redeemer.couponCode;
    response.data.message = 'New coupon created and points awarded';
  }

  res.json(response);
}));
module.exports = router;
