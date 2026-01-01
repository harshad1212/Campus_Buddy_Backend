const mongoose = require("mongoose");
const User = require("../models/User");

const addPoints = async ({
  userId,
  type,
  points,
  refId = null,
  description = "",
}) => {
  try {
    if (!userId) {
      console.error("🔴 addPoints failed: userId is missing");
      return;
    }

    const normalizedUserId = mongoose.Types.ObjectId.isValid(userId)
      ? userId
      : null;

    if (!normalizedUserId) {
      console.error("🔴 addPoints failed: invalid userId", userId);
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      normalizedUserId,
      {
        $inc: { totalPoints: points },
        $push: {
          pointHistory: {
            type,
            points,
            refId,
            description,
          },
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      console.error("🔴 addPoints failed: user not found", normalizedUserId);
      return;
    }

    console.log(
      `✅ Points added: ${points} (${type}) → User ${updatedUser._id}`
    );
  } catch (err) {
    console.error("❌ addPoints exception:", err.message);
  }
};

module.exports = addPoints;
