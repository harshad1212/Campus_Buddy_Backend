// routes/friendRoutes.js
const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const User = require("../models/User");

// Send friend request
router.post("/send-request/:targetId", authMiddleware, async (req, res) => {
  try {
    const { targetId } = req.params;
    const senderId = req.user._id.toString();

    if (senderId === targetId) return res.status(400).json({ error: "Cannot add yourself" });

    const targetUser = await User.findById(targetId);
    const senderUser = await User.findById(senderId);

    if (!targetUser) return res.status(404).json({ error: "User not found" });
    if (senderUser.friends.includes(targetId)) return res.status(400).json({ error: "Already friends" });
    if (senderUser.sentRequests.includes(targetId)) return res.status(400).json({ error: "Friend request already sent" });

    senderUser.sentRequests.push(targetId);
    targetUser.friendRequests.push(senderId);

    await senderUser.save();
    await targetUser.save();

    // Notify target user via socket
    if (global.chatNs?.onlineUsersMap) {
      const targetSockets = global.chatNs.onlineUsersMap.get(targetId);
      if (targetSockets) {
        for (const sid of targetSockets) {
          global.chatNs.to(sid).emit("friend-request-received", {
            from: {
              _id: senderUser._id,
              name: senderUser.name,
              avatarUrl: senderUser.avatarUrl,
            },
          });
        }
      }
    }

    return res.json({ message: "Friend request sent successfully" });
  } catch (err) {
    console.error("Friend request error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Cancel sent request
router.delete("/cancel-request/:targetId", authMiddleware, async (req, res) => {
  try {
    const { targetId } = req.params;
    const senderId = req.user._id.toString();

    const senderUser = await User.findById(senderId);
    const targetUser = await User.findById(targetId);

    if (!senderUser || !targetUser) return res.status(404).json({ error: "User not found" });

    senderUser.sentRequests = senderUser.sentRequests.filter(id => id.toString() !== targetId);
    targetUser.friendRequests = targetUser.friendRequests.filter(id => id.toString() !== senderId);

    await senderUser.save();
    await targetUser.save();

    return res.json({ message: "Friend request canceled" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Accept received request
router.post("/accept-request/:senderId", authMiddleware, async (req, res) => {
  try {
    const { senderId } = req.params;
    const targetId = req.user._id.toString();

    const senderUser = await User.findById(senderId);
    const targetUser = await User.findById(targetId);

    if (!senderUser || !targetUser) return res.status(404).json({ error: "User not found" });

    // Remove requests
    senderUser.sentRequests = senderUser.sentRequests.filter(id => id.toString() !== targetId);
    targetUser.friendRequests = targetUser.friendRequests.filter(id => id.toString() !== senderId);

    // Add to friends
    if (!senderUser.friends.includes(targetId)) senderUser.friends.push(targetId);
    if (!targetUser.friends.includes(senderId)) targetUser.friends.push(senderId);

    await senderUser.save();
    await targetUser.save();

    return res.json({ message: "Friend request accepted", friend: senderUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Reject received request
router.post("/reject-request/:senderId", authMiddleware, async (req, res) => {
  try {
    const { senderId } = req.params;
    const targetId = req.user._id.toString();

    const senderUser = await User.findById(senderId);
    const targetUser = await User.findById(targetId);

    if (!senderUser || !targetUser) return res.status(404).json({ error: "User not found" });

    // Remove requests
    senderUser.sentRequests = senderUser.sentRequests.filter(id => id.toString() !== targetId);
    targetUser.friendRequests = targetUser.friendRequests.filter(id => id.toString() !== senderId);

    await senderUser.save();
    await targetUser.save();

    return res.json({ message: "Friend request rejected" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
