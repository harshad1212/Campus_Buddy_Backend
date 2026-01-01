// routes/leaderboard.js
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
      .select("name avatarUrl totalPoints pointHistory");

    const leaderboard = users.map((user) => {
      let resourcePoints = 0;
      let forumPoints = 0;
      let eventPoints = 0;

      user.pointHistory.forEach((p) => {
        if (
          ["RESOURCE_UPLOAD", "RESOURCE_DOWNLOAD", "RESOURCE_LIKE"].includes(p.type)
        ) {
          resourcePoints += p.points;
        }

        if (p.type === "FORUM_ANSWER") {
          forumPoints += p.points;
        }

        if (
          ["EVENT_PARTICIPATION", "EVENT_WIN"].includes(p.type)
        ) {
          eventPoints += p.points;
        }
      });

      const forumBadges = [];
      if (forumPoints >= 50) forumBadges.push("Top Helper");

      return {
        userId: user._id,
        name: user.name,
        avatarUrl: user.avatarUrl,

        points: user.totalPoints,
        resourcePoints,
        forumPoints,
        eventPoints,

        forumBadges,
      };
    });

    // 🥇 Sort & Rank
    leaderboard.sort((a, b) => b.points - a.points);
    leaderboard.forEach((u, i) => (u.rank = i + 1));

    res.status(200).json(leaderboard);
  } catch (err) {
    console.error("❌ Leaderboard error:", err);
    res.status(500).json({ message: "Failed to load leaderboard" });
  }
});

module.exports = router;
