const express = require("express");
const router = express.Router();
const Event = require("../models/Event");

// ✅ FIXED IMPORT
const authMiddleware = require("../middleware/auth");

// ✅ Create event (Student/Teacher)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, description, date, time, venue } = req.body;

    const event = new Event({
      title,
      description,
      date,
      time,
      venue,
      creatorId: req.user._id,
      creatorName: req.user.name,
      approvedByAdmin: req.user.role === "admin",
      approvedAt: req.user.role === "admin" ? new Date() : undefined,
    });

    await event.save();
    res.status(201).json({
      message: event.approvedByAdmin
        ? "Event created and approved."
        : "Event created. Awaiting admin approval.",
      event,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all approved events
router.get("/", async (req, res) => {
  try {
    const events = await Event.find({ approvedByAdmin: true })
      .sort({ date: 1 })
      .populate("attendees", "name email");
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ RSVP / Join event
router.post("/:id/join", authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.attendees.includes(req.user._id))
      return res.status(400).json({ message: "Already joined" });

    event.attendees.push(req.user._id);
    await event.save();

    res.json({ message: "Joined successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Leave event
router.post("/:id/leave", authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    event.attendees = event.attendees.filter(
      (a) => a.toString() !== req.user._id.toString()
    );
    await event.save();

    res.json({ message: "Left event." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Admin: approve event
router.put("/:id/approve", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { approvedByAdmin: true, approvedAt: new Date() },
      { new: true }
    );
    if (!event) return res.status(404).json({ message: "Event not found" });

    res.json({ message: "Event approved", event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Admin: view pending events
router.get("/admin/pending", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const events = await Event.find({ approvedByAdmin: false })
      .sort({ createdAt: -1 })
      .populate("creatorId", "name email");
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
