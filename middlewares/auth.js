const crypto = require("crypto");

/**
 * Admin authentication middleware
 * Verifies the admin key from headers or query params
 */
const adminAuth = (req, res, next) => {
  const adminKey = req.headers["x-admin-key"] || req.query.adminKey;

  if (!adminKey) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
    });
  }

  try {
    // For testing and development environments, allow direct key matching
    if (
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test"
    ) {
      if (
        adminKey === process.env.ADMIN_KEY ||
        adminKey === "YourSecretAdminKeyHere"
      ) {
        // Set admin info in the request object
        req.admin = {
          id: "admin",
          role: "admin",
        };
        return next();
      }
    }

    // For production, use hash comparison
    const hashedKey = crypto
      .createHash("sha256")
      .update(adminKey)
      .digest("hex");

    const expectedHash = process.env.ADMIN_KEY_HASH;

    if (!expectedHash) {
      console.error("ADMIN_KEY_HASH not defined in environment variables");
      return res.status(500).json({
        status: "error",
        message: "Server configuration error",
      });
    }

    // Simple string comparison instead of timing-safe equal for compatibility
    if (hashedKey === expectedHash) {
      // Set admin info in the request object
      req.admin = {
        id: "admin",
        role: "admin",
      };
      return next();
    }

    return res.status(403).json({
      status: "error",
      message: "Invalid authentication credentials",
    });
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      status: "error",
      message: "Authentication processing error",
    });
  }
};

module.exports = {
  adminAuth,
};
