const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const User = require("../models/User");

// ==================== SEND FRIEND REQUEST ====================
router.post("/send-request/:targetId", authMiddleware, async (req, res) => {
  try {
    const { targetId } = req.params;
    const senderId = req.user._id.toString();

    if (senderId === targetId)
      return res.status(400).json({ error: "Cannot add yourself" });

    const targetUser = await User.findById(targetId);
    const senderUser = await User.findById(senderId);

    if (!targetUser) return res.status(404).json({ error: "User not found" });

    // Prevent sending requests to or from blocked users
    if (
      senderUser.blockedUsers?.includes(targetId) ||
      targetUser.blockedUsers?.includes(senderId)
    ) {
      return res
        .status(403)
        .json({ error: "Cannot send friend request to a blocked user." });
    }

    if (senderUser.friends.includes(targetId))
      return res.status(400).json({ error: "Already friends" });
    if (senderUser.sentRequests.includes(targetId))
      return res.status(400).json({ error: "Friend request already sent" });

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

// ==================== CANCEL SENT REQUEST ====================
router.delete("/cancel-request/:targetId", authMiddleware, async (req, res) => {
  try {
    const { targetId } = req.params;
    const senderId = req.user._id.toString();

    const senderUser = await User.findById(senderId);
    const targetUser = await User.findById(targetId);

    if (!senderUser || !targetUser)
      return res.status(404).json({ error: "User not found" });

    senderUser.sentRequests = senderUser.sentRequests.filter(
      (id) => id.toString() !== targetId
    );
    targetUser.friendRequests = targetUser.friendRequests.filter(
      (id) => id.toString() !== senderId
    );

    await senderUser.save();
    await targetUser.save();

    return res.json({ message: "Friend request canceled" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ==================== ACCEPT FRIEND REQUEST ====================
router.post("/accept-request/:senderId", authMiddleware, async (req, res) => {
  try {
    const { senderId } = req.params;
    const targetId = req.user._id.toString();

    const senderUser = await User.findById(senderId);
    const targetUser = await User.findById(targetId);

    if (!senderUser || !targetUser)
      return res.status(404).json({ error: "User not found" });

    // Check block status
    if (
      senderUser.blockedUsers?.includes(targetId) ||
      targetUser.blockedUsers?.includes(senderId)
    ) {
      return res
        .status(403)
        .json({ error: "Cannot accept request — user is blocked." });
    }

    // Remove pending requests
    senderUser.sentRequests = senderUser.sentRequests.filter(
      (id) => id.toString() !== targetId
    );
    targetUser.friendRequests = targetUser.friendRequests.filter(
      (id) => id.toString() !== senderId
    );

    // Add each other as friends
    if (!senderUser.friends.includes(targetId))
      senderUser.friends.push(targetId);
    if (!targetUser.friends.includes(senderId))
      targetUser.friends.push(senderId);

    await senderUser.save();
    await targetUser.save();

    return res.json({ message: "Friend request accepted", friend: senderUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ==================== REJECT FRIEND REQUEST ====================
router.post("/reject-request/:senderId", authMiddleware, async (req, res) => {
  try {
    const { senderId } = req.params;
    const targetId = req.user._id.toString();

    const senderUser = await User.findById(senderId);
    const targetUser = await User.findById(targetId);

    if (!senderUser || !targetUser)
      return res.status(404).json({ error: "User not found" });

    senderUser.sentRequests = senderUser.sentRequests.filter(
      (id) => id.toString() !== targetId
    );
    targetUser.friendRequests = targetUser.friendRequests.filter(
      (id) => id.toString() !== senderId
    );

    await senderUser.save();
    await targetUser.save();

    return res.json({ message: "Friend request rejected" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ==================== BLOCK USER ====================
// ==================== BLOCK USER ====================
router.post("/block/:targetId", authMiddleware, async (req, res) => {
  try {
    const { targetId } = req.params;
    const userId = req.user._id.toString();

    if (userId === targetId)
      return res.status(400).json({ error: "You cannot block yourself" });

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetId);

    if (!user || !targetUser)
      return res.status(404).json({ error: "User not found" });

    // ✅ DO NOT REMOVE FROM FRIEND LIST ANYMORE
    // Keep them as friends but still block communication

    // ✅ Remove any pending requests (optional, keeps system clean)
    user.sentRequests = user.sentRequests.filter((id) => id.toString() !== targetId);
    targetUser.sentRequests = targetUser.sentRequests.filter((id) => id.toString() !== userId);
    user.friendRequests = user.friendRequests.filter((id) => id.toString() !== targetId);
    targetUser.friendRequests = targetUser.friendRequests.filter((id) => id.toString() !== userId);

    // ✅ Add target to blocked list if not already there
    if (!user.blockedUsers.includes(targetId)) {
      user.blockedUsers.push(targetId);
      await user.save();
    }

    return res.json({ message: "User blocked successfully" });
  } catch (err) {
    console.error("Block error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});


// ==================== CHECK BLOCK STATUS ====================
router.get("/block-status/:targetId", authMiddleware, async (req, res) => {
  try {
    const { targetId } = req.params;
    const userId = req.user._id.toString();

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetId);

    if (!user || !targetUser)
      return res.status(404).json({ error: "User not found" });

    const isBlockedByYou = user.blockedUsers.includes(targetId);
    const isBlockedByTarget = targetUser.blockedUsers.includes(userId);

    return res.json({
      isBlockedByYou,
      isBlockedByTarget,
    });
  } catch (err) {
    console.error("Block status error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ==================== UNBLOCK USER ====================
router.delete("/unblock/:targetId", authMiddleware, async (req, res) => {
  try {
    const { targetId } = req.params;
    const userId = req.user._id.toString();

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetId);

    if (!user || !targetUser)
      return res.status(404).json({ error: "User not found" });

    // Check if target user is actually blocked
    if (!user.blockedUsers.includes(targetId)) {
      return res.status(400).json({ error: "User is not blocked" });
    }

    // Remove target from blockedUsers list
    user.blockedUsers = user.blockedUsers.filter(
      (id) => id.toString() !== targetId
    );
    await user.save();

    return res.json({ message: "User unblocked successfully" });
  } catch (err) {
    console.error("Unblock error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});
// ==================== UNFRIEND USER ====================
router.delete("/unfriend/:targetId", authMiddleware, async (req, res) => {
  try {
    const { targetId } = req.params;
    const userId = req.user._id.toString();

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetId);

    if (!user || !targetUser)
      return res.status(404).json({ error: "User not found" });

    // Remove each other from friends list
    user.friends = user.friends.filter((id) => id.toString() !== targetId);
    targetUser.friends = targetUser.friends.filter((id) => id.toString() !== userId);

    await user.save();
    await targetUser.save();

    return res.json({ message: "User unfriended successfully" });
  } catch (err) {
    console.error("Unfriend error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;
