const crypto = require("crypto");

/**
 * Generate a unique coupon code based on twitterId and random data
 *
 * @param {string} twitterId - User's Twitter ID
 * @param {number} length - Length of the code (default: 8)
 * @returns {string} - Generated coupon code
 */
const generateCouponCode = (twitterId, length = 8) => {
  // Combine twitterId with current timestamp and random bytes
  const data = `${twitterId}${Date.now()}${crypto
    .randomBytes(16)
    .toString("hex")}`;

  // Create hash
  const hash = crypto.createHash("sha256").update(data).digest("hex");

  // Format the code to be user-friendly
  // Take the first 'length' characters and format them in groups
  const code = hash.substring(0, length).toUpperCase();

  // Optional: Format in groups of 4 with hyphens if length > 4
  if (length > 4) {
    return code.match(/.{1,4}/g).join("-");
  }

  return code;
};

module.exports = generateCouponCode;
