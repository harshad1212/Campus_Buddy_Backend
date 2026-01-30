const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

/**
 * GET ALL TEACHERS BY UNIVERSITY CODE
 * /api/users/teachers/:code
 */
router.get("/teachers/:code", authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;

    const teachers = await User.find({
      role: "teacher",
      universityCode: code.toUpperCase(),
      isApproved: true, // optional but recommended
    }).select("_id name email department");

    res.status(200).json(teachers);
  } catch (err) {
    console.error("FETCH TEACHERS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
});
/**
 * GET ALL USERS + FRIEND DATA (FOR CHAT)
 * GET /api/users
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);

    // 1️⃣ Fetch ALL users from same university (including friends)
    const users = await User.find({
      universityId: currentUser.universityId,
      _id: { $ne: currentUser._id },
    }).select("_id name avatarUrl universityId");

    // 2️⃣ Send users + friend metadata
    res.json({
      users,
      currentUserFriends: currentUser.friends,
      currentUserFriendRequests: currentUser.friendRequests,
      currentUserSentRequests: currentUser.sentRequests,
      currentUserBlockedUsers: currentUser.blockedUsers,
    });
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

module.exports = router;
