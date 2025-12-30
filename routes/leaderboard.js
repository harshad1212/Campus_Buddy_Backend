const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

/**
 * 🏆 GET Leaderboard
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ isApproved: true })
      .select("name avatarUrl points")
      .sort({ "points.total": -1 });

    const leaderboard = users.map((user, index) => {
      const rank = index + 1;

      // 🧮 SAFE POINT EXTRACTION (matches schema exactly)
      const breakdown = user.points?.breakdown || {};

      const resourcePoints =
        (breakdown.resourceUpload || 0) +
        (breakdown.resourceDownload || 0) +
        (breakdown.resourceLike || 0);

      const forumPoints =
        (breakdown.forumAnswer || 0) +
        (breakdown.forumBestAnswer || 0);

      const eventPoints =
        (breakdown.eventParticipation || 0) +
        (breakdown.eventWin || 0);

      const totalPoints = user.points?.total || 0;

      // 🥇 Rank Badge
      let rankBadge = "Bronze";
      if (rank === 1) rankBadge = "Gold";
      else if (rank === 2) rankBadge = "Silver";

      // 🎖 Forum Badges (derived dynamically)
      const forumBadges = [];
      if ((breakdown.forumAnswer || 0) >= 50)
        forumBadges.push("Top Helper");
      if ((breakdown.forumBestAnswer || 0) >= 5)
        forumBadges.push("Best Answers");

      return {
        userId: user._id,
        rank,
        name: user.name,
        avatarUrl: user.avatarUrl,

        // 🔢 Points per category
        points: totalPoints,
        resourcePoints,
        forumPoints,
        eventPoints,

        rankBadge,
        forumBadges,
      };
    });

    res.status(200).json(leaderboard);
  } catch (err) {
    console.error("❌ Leaderboard error:", err);
    res.status(500).json({ message: "Failed to load leaderboard" });
  }
});

module.exports = router;
