// routes/adminRoutes.js
const express = require("express");
const User = require("../models/User");
const University = require("../models/University");

const router = express.Router();

// --- Get all pending requests ---
router.get("/pending-requests/:universityCode", async (req, res) => {
  try {
    const { universityCode } = req.params;

    const university = await University.findOne({ code: universityCode });
    if (!university)
      return res.status(404).json({ error: "University not found" });

    const pendingUsers = await User.find({
      universityId: university._id,
      isApproved: false,
    }).select("name email role universityId");

    res.json(pendingUsers);
  } catch (err) {
    console.error("Fetch pending requests error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Approve user ---
router.post("/approve-request/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("universityId");
    if (!user) return res.status(404).json({ error: "User not found" });

    user.isApproved = true;
    await user.save();

    console.log(`✅ Approved ${user.name} (${user.email})`);

    res.json({ message: "User approved successfully" });
  } catch (err) {
    console.error("Approve request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Reject user ---
router.post("/reject-request/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    await user.deleteOne();
    console.log(`❌ Rejected ${user.name} (${user.email})`);

    res.json({ message: "User rejected successfully" });
  } catch (err) {
    console.error("Reject request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
