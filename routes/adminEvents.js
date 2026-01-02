const express = require("express");
const auth = require("../middleware/auth");
const Event = require("../models/Event");

const router = express.Router();

/* 🔒 Admin only */
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
};

/* 1️⃣ Get pending events */
router.get("/pending", auth, isAdmin, async (req, res) => {
  const events = await Event.find({ status: "pending" }).populate(
    "createdBy",
    "name"
  );
  res.json(events);
});

/* 2️⃣ Approve event */
router.put("/:id/approve", auth, isAdmin, async (req, res) => {
  await Event.findByIdAndUpdate(req.params.id, {
    status: "approved",
  });
  res.json({ message: "Event approved" });
});

/* 3️⃣ Reject event */
router.put("/:id/reject", auth, isAdmin, async (req, res) => {
  await Event.findByIdAndUpdate(req.params.id, {
    status: "rejected",
  });
  res.json({ message: "Event rejected" });
});

module.exports = router;
