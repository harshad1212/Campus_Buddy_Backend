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

  await User.findByIdAndUpdate(
    userId,
    {
      $inc: {
        totalPoints: points,
      },
      $push: {
        pointHistory: {
          type, // MUST match enum exactly
          points,
          refId,
          description,
        },
      },
    },
    { new: true }
  );
};

module.exports = addPoints;
