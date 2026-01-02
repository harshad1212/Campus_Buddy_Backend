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

module.exports = router;
