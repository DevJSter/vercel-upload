const express = require("express");
const router = express.Router();
const AccessCode = require("../models/AccessCode");
const asyncHandler = require("../utils/asyncHandler");
const { adminAuth } = require("../middlewares/auth");
const { ValidationError } = require("../utils/AppError");

// Admin authentication middleware
router.use(adminAuth);

// Create a new access code
router.post(
  "/access-code",
  asyncHandler(async (req, res) => {
    const { description, maxUses, expiryDays } = req.body;

    // Validate inputs
    if (!maxUses || !expiryDays) {
      throw new ValidationError("maxUses and expiryDays are required");
    }

    if (maxUses < 1) {
      throw new ValidationError("maxUses must be at least 1");
    }

    if (expiryDays < 1) {
      throw new ValidationError("expiryDays must be at least 1");
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays));

    // Generate a unique code
    let isUnique = false;
    let code;

    while (!isUnique) {
      // Generate a code
      code = AccessCode.generateCode();

      // Check if the code already exists
      const existing = await AccessCode.findOne({ code });
      if (!existing) {
        isUnique = true;
      }
    }

    // Create the access code
    const accessCode = await AccessCode.create({
      code,
      description: description || "Beta access code",
      maxUses: parseInt(maxUses),
      expiresAt,
      createdBy: req.admin ? req.admin.id : "admin",
    });

    res.status(201).json({
      status: "success",
      data: {
        accessCode: {
          code: accessCode.code,
          description: accessCode.description,
          maxUses: accessCode.maxUses,
          expiresAt: accessCode.expiresAt,
          active: accessCode.active,
        },
      },
    });
  })
);

// Get all access codes with pagination and filtering
router.get(
  "/access-codes",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};

    // Apply filters if provided
    if (req.query.active !== undefined) {
      filter.active = req.query.active === "true";
    }

    if (req.query.expired === "true") {
      filter.expiresAt = { $lt: new Date() };
    } else if (req.query.expired === "false") {
      filter.expiresAt = { $gt: new Date() };
    }

    if (req.query.code) {
      filter.code = { $regex: req.query.code, $options: "i" };
    }

    const [accessCodes, total] = await Promise.all([
      AccessCode.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-__v"),
      AccessCode.countDocuments(filter),
    ]);

    res.json({
      status: "success",
      data: {
        accessCodes,
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

// Get access code details including usage stats
router.get(
  "/access-code/:code",
  asyncHandler(async (req, res) => {
    const accessCode = await AccessCode.findOne({ code: req.params.code });

    if (!accessCode) {
      return res.status(404).json({
        status: "error",
        message: "Access code not found",
      });
    }

    // Calculate statistics
    const usagePercentage = (accessCode.usedCount / accessCode.maxUses) * 100;
    const isExpired = accessCode.expiresAt < new Date();
    const isUsable =
      accessCode.active &&
      !isExpired &&
      accessCode.usedCount < accessCode.maxUses;

    res.json({
      status: "success",
      data: {
        accessCode: {
          ...accessCode.toJSON(),
          stats: {
            usagePercentage: parseFloat(usagePercentage.toFixed(2)),
            isExpired,
            isUsable,
            remainingUses: accessCode.maxUses - accessCode.usedCount,
            daysUntilExpiry: isExpired
              ? 0
              : Math.ceil(
                  (accessCode.expiresAt - new Date()) / (1000 * 60 * 60 * 24)
                ),
          },
        },
      },
    });
  })
);

// Deactivate an access code
router.patch(
  "/access-code/:code/deactivate",
  asyncHandler(async (req, res) => {
    const accessCode = await AccessCode.findOne({ code: req.params.code });

    if (!accessCode) {
      return res.status(404).json({
        status: "error",
        message: "Access code not found",
      });
    }

    accessCode.active = false;
    await accessCode.save();

    res.json({
      status: "success",
      message: "Access code deactivated successfully",
      data: {
        code: accessCode.code,
        active: accessCode.active,
      },
    });
  })
);

// Reactivate an access code
router.patch(
  "/access-code/:code/activate",
  asyncHandler(async (req, res) => {
    const accessCode = await AccessCode.findOne({ code: req.params.code });

    if (!accessCode) {
      return res.status(404).json({
        status: "error",
        message: "Access code not found",
      });
    }

    // Don't reactivate if max uses reached
    if (accessCode.usedCount >= accessCode.maxUses) {
      return res.status(400).json({
        status: "error",
        message: "Cannot reactivate: maximum usage limit reached",
      });
    }

    // Don't reactivate if expired
    if (accessCode.expiresAt < new Date()) {
      return res.status(400).json({
        status: "error",
        message: "Cannot reactivate: access code has expired",
      });
    }

    accessCode.active = true;
    await accessCode.save();

    res.json({
      status: "success",
      message: "Access code reactivated successfully",
      data: {
        code: accessCode.code,
        active: accessCode.active,
      },
    });
  })
);

// Delete an access code
router.delete(
  "/access-code/:code",
  asyncHandler(async (req, res) => {
    const accessCode = await AccessCode.findOneAndDelete({
      code: req.params.code,
    });

    if (!accessCode) {
      return res.status(404).json({
        status: "error",
        message: "Access code not found",
      });
    }

    res.json({
      status: "success",
      message: "Access code deleted successfully",
    });
  })
);

// Get access code statistics
router.get(
  "/access-code-stats",
  asyncHandler(async (req, res) => {
    const [
      totalAccessCodes,
      activeAccessCodes,
      expiredAccessCodes,
      fullyUsedAccessCodes,
      totalUsages,
      mostUsedCode,
    ] = await Promise.all([
      AccessCode.countDocuments(),
      AccessCode.countDocuments({
        active: true,
        expiresAt: { $gt: new Date() },
      }),
      AccessCode.countDocuments({
        expiresAt: { $lt: new Date() },
      }),
      AccessCode.countDocuments({
        $expr: { $gte: ["$usedCount", "$maxUses"] },
      }),
      AccessCode.aggregate([
        { $group: { _id: null, total: { $sum: "$usedCount" } } },
      ]),
      AccessCode.findOne()
        .sort({ usedCount: -1 })
        .limit(1)
        .select("code description usedCount maxUses"),
    ]);

    const totalUsed = totalUsages[0]?.total || 0;

    res.json({
      status: "success",
      data: {
        totalAccessCodes,
        activeAccessCodes,
        expiredAccessCodes,
        fullyUsedAccessCodes,
        totalUsages: totalUsed,
        mostUsedCode: mostUsedCode || null,
      },
    });
  })
);

module.exports = router;
