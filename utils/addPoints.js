const User = require("../models/User");

/**
 * Generic helper to add points safely
 */
const addPoints = async ({
  userId,
  type,
  points,
  refId,
  description,
}) => {
  if (!userId || !type || !points) return;

  await User.findByIdAndUpdate(userId, {
    $inc: {
      "points.total": points,
      [`points.breakdown.${type}`]: points,
    },
    $push: {
      "points.history": {
        type: type.toUpperCase(),
        points,
        refId,
        description,
      },
    },
  });
};

module.exports = addPoints;
