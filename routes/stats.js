const express = require("express");
const router = express.Router();

const Resource = require("../models/Resource");
const Event = require("../models/Event");
const User = require("../models/User");
const ForumQuestion = require("../models/ForumQuestion");

/* ===========================
   GET PLATFORM STATS
=========================== */
router.get("/", async (req, res) => {
  try {
    const [resources, events, users, discussions] = await Promise.all([
      Resource.countDocuments(),
      Event.countDocuments(),
      User.countDocuments(),
      ForumQuestion.countDocuments(),
    ]);

    res.json({
      resources,
      events,
      users,
      discussions,
    });
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

module.exports = router;
