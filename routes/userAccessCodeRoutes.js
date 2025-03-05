const express = require("express");
const router = express.Router();
const AccessCode = require("../models/AccessCode");
const asyncHandler = require("../utils/asyncHandler");
const { ValidationError, ForbiddenError } = require("../utils/AppError");

// Validate access code without redeeming it
router.get(
  "/access-code/validate/:code",
  asyncHandler(async (req, res) => {
    const { code } = req.params;

    if (!code) {
      throw new ValidationError("Access code is required");
    }

    const accessCode = await AccessCode.findOne({ code: code.toUpperCase() });

    if (!accessCode) {
      return res.status(404).json({
        status: "error",
        message: "Invalid access code",
        valid: false,
      });
    }

    const validationResult = accessCode.isValid();

    res.json({
      status: validationResult.valid ? "success" : "error",
      message: validationResult.valid
        ? "Access code is valid"
        : validationResult.reason,
      valid: validationResult.valid,
      data: validationResult.valid
        ? {
            description: accessCode.description,
            expiresAt: accessCode.expiresAt,
            remainingUses: accessCode.maxUses - accessCode.usedCount,
            usedCount: accessCode.usedCount,
          }
        : null,
    });
  })
);

// Redeem an access code
router.post(
  "/access-code/redeem",
  asyncHandler(async (req, res) => {
    const { code, username } = req.body;

    // Validate required fields
    if (!code || !username) {
      throw new ValidationError("Access code and username are required");
    }

    // Find the access code
    const accessCode = await AccessCode.findOne({ code: code.toUpperCase() });

    if (!accessCode) {
      return res.status(404).json({
        status: "error",
        message: "Invalid access code",
      });
    }

    // Check if access code is valid
    const validationResult = accessCode.isValid();

    if (!validationResult.valid) {
      return res.status(403).json({
        status: "error",
        message: validationResult.reason,
      });
    }

    // Check if this user has already used this access code
    const alreadyUsed = accessCode.usedBy.some(
      (user) => user.username === username
    );

    if (alreadyUsed) {
      return res.status(403).json({
        status: "error",
        message: "You have already used this access code",
      });
    }

    try {
      // Record the code usage
      await accessCode.useCode(username);

      res.json({
        status: "success",
        message: "Access code redeemed successfully",
        data: {
          description: accessCode.description,
          active: accessCode.active,
        },
      });
    } catch (error) {
      throw new ForbiddenError(error.message);
    }
  })
);

// Check if user has redeemed any access code
router.get(
  "/access-code/user/:username",
  asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) {
      throw new ValidationError("Username is required");
    }

    // Find any access codes redeemed by this user
    const accessCodes = await AccessCode.find({
      "usedBy.username": username,
    }).select("code description expiresAt createdAt");

    const hasRedeemedAny = accessCodes.length > 0;

    res.json({
      status: "success",
      data: {
        hasRedeemedAccessCode: hasRedeemedAny,
        accessCodes: hasRedeemedAny ? accessCodes : [],
      },
    });
  })
);

// Check if a user has used any access code in the system
router.get(
  "/access-code/check-user/:username",
  asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) {
      throw new ValidationError("Username is required");
    }

    // Find any access codes that this user has used
    const accessCodes = await AccessCode.find({
      "usedBy.username": username,
    }).select("code description expiresAt active");

    // Check if there are any valid codes (still active and not expired)
    const now = new Date();
    const validCodes = accessCodes.filter(
      (code) => code.active && code.expiresAt > now
    );

    const hasUsedAny = accessCodes.length > 0;
    const hasValidAccess = validCodes.length > 0;

    res.json({
      status: "success",
      data: {
        hasUsedAccessCode: hasUsedAny,
        hasValidAccess: hasValidAccess,
        usedCodes: hasUsedAny
          ? accessCodes.map((code) => ({
              code: code.code,
              description: code.description,
              expiresAt: code.expiresAt,
              isValid: code.active && code.expiresAt > now,
            }))
          : [],
        validAccessCode: hasValidAccess ? validCodes[0].code : null,
      },
    });
  })
);

module.exports = router;
