// routes/roomRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const Room = require("../models/Room");
const Message = require("../models/Message");

// ==================== CLEAR CHAT (DELETE ALL MESSAGES) ====================
// routes/roomRoutes.js
router.delete("/:roomId/clear", authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id.toString();

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: "Chat room not found" });
    }

    const isMember = room.members.some((m) => m.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ error: "You are not a member of this chat" });
    }

    // Delete all messages
    await Message.deleteMany({ chat: roomId });
    room.lastMessage = null;
    await room.save();

    // ✅ Emit real-time event to both participants
    if (global.chatNs?.to) {
      room.members.forEach((memberId) => {
        global.chatNs.to(memberId.toString()).emit("chat-cleared", {
          roomId,
          clearedBy: userId,
        });
      });
    }

    return res.json({ message: "Chat cleared successfully" });
  } catch (err) {
    console.error("Error clearing chat:", err);
    return res.status(500).json({ error: "Server error clearing chat" });
  }
});


module.exports = router;
