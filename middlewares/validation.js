const Joi = require("joi");

// Validation schemas
const schemas = {
  generateCoupon: Joi.object({
    twitterId: Joi.string().trim().required(),
    username: Joi.string().trim().required(),
    followers: Joi.number().integer().min(1000).required(),
    role: Joi.string().valid("creator", "user").default("user"),
  }),

  redeemCoupon: Joi.object({
    redeemerTwitterId: Joi.string().trim().required(),
    couponCode: Joi.string().trim().required(),
  }),

  getCoupon: Joi.object({
    twitterId: Joi.string().trim().required(),
  }),
};

// Validation middleware factory
const validateRequest = (schema) => {
  return (req, res, next) => {
    const dataToValidate = req.method === "GET" ? req.query : req.body;
    const { error } = schema.validate(dataToValidate, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        status: "error",
        errors: errorMessages,
      });
    }

    next();
  };
};

module.exports = {
  validateGenerateCoupon: validateRequest(schemas.generateCoupon),
  validateRedeemCoupon: validateRequest(schemas.redeemCoupon),
  validateGetCoupon: validateRequest(schemas.getCoupon),
};
