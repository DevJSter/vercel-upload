const mongoose = require("mongoose");

const accessCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      minlength: 6,
      maxlength: 6,
      uppercase: true,
    },
    description: {
      type: String,
      default: "Beta access code",
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    maxUses: {
      type: Number,
      required: true,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    usedBy: [
      {
        username: {
          type: String,
          required: true,
        },
        redeemedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Method to check if access code is valid
accessCodeSchema.methods.isValid = function () {
  // Check if expired
  if (this.expiresAt < new Date()) {
    return {
      valid: false,
      reason: "Access code has expired",
    };
  }

  // Check if active
  if (!this.active) {
    return {
      valid: false,
      reason: "Access code is inactive",
    };
  }

  // Check if max uses reached
  if (this.usedCount >= this.maxUses) {
    return {
      valid: false,
      reason: "Access code has reached maximum usage limit",
    };
  }

  return {
    valid: true,
  };
};

// Method to mark code as used by a user
accessCodeSchema.methods.useCode = function (username) {
  // Check if this user has already used this code
  const alreadyUsed = this.usedBy.some((user) => user.username === username);

  if (alreadyUsed) {
    throw new Error("You have already used this access code");
  }

  // Add user to usedBy array
  this.usedBy.push({
    username,
    redeemedAt: new Date(),
  });

  // Increment used count
  this.usedCount += 1;

  // Automatically deactivate if max uses reached
  if (this.usedCount >= this.maxUses) {
    this.active = false;
  }

  return this.save();
};

// Static method to generate random 6-digit alphanumeric code
accessCodeSchema.statics.generateCode = function () {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }

  return code;
};

// Static method to find valid access codes
accessCodeSchema.statics.findValid = function () {
  return this.find({
    active: true,
    expiresAt: { $gt: new Date() },
    $expr: { $lt: ["$usedCount", "$maxUses"] },
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model("AccessCode", accessCodeSchema);
