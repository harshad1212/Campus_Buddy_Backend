const express = require("express");
const Event = require("../models/Event");
const auth = require("../middleware/auth");
const role = require("../middleware/roleMiddleware");

const router = express.Router();

/* =========================================================
   TEACHER: CREATE EVENT (FULL DATA STORED)
   ========================================================= */
router.post(
  "/",
  auth,
  role(["teacher"]),
  async (req, res) => {
    try {
      const {
        title,
        description,
        date,
        time,
        venue,
        eventType,
        mode,
        department,
        organizers,
        deadline,
        contactEmail,
        registrationLink,
        notes,
      } = req.body;

      // Basic validation
      if (!title || !date || !time || !venue || !department || !organizers?.length) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const event = await Event.create({
        title,
        description,
        date,
        time,
        venue,
        eventType,
        mode,
        department,
        organizers,
        deadline,
        contactEmail,
        registrationLink,
        notes,
        createdBy: req.user._id,
        universityCode: req.user.universityCode,
      });

      res.status(201).json({
        message: "Event sent for admin approval",
        event,
      });
    } catch (err) {
      console.error("CREATE EVENT ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =========================================================
   STUDENT + TEACHER: VIEW APPROVED EVENTS
   ========================================================= */
router.get(
  "/",
  auth,
  async (req, res) => {
    try {
      const events = await Event.find({
        universityCode: req.user.universityCode,
        status: "approved",
      })
        .populate("organizers", "name department email")
        .sort({ date: 1, time: 1 });

      res.json(events);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  }
);

/* =========================================================
   ADMIN: VIEW PENDING EVENTS (FULL DETAILS)
   ========================================================= */
router.get(
  "/admin/pending/:universityCode",
  auth,
  role(["admin", "superadmin"]),
  async (req, res) => {
    try {
      const events = await Event.find({
        universityCode: req.params.universityCode,
        status: "pending",
      })
        .populate("createdBy", "name email department")
        .populate("organizers", "name department email")
        .sort({ createdAt: -1 });

      res.json(events);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch pending events" });
    }
  }
);

/* =========================================================
   ADMIN: APPROVE / REJECT EVENT
   ========================================================= */
router.post(
  "/admin/action/:id",
  auth,
  role(["admin", "superadmin"]),
  async (req, res) => {
    try {
      const { action } = req.body;

      if (!["approve", "reject"].includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
      }

      const status = action === "approve" ? "approved" : "rejected";

      await Event.findByIdAndUpdate(req.params.id, {
        status,
        reviewedBy: req.user._id,
      });

      res.json({ message: `Event ${status}` });
    } catch (err) {
      res.status(500).json({ error: "Failed to update event status" });
    }
  }
);

/* =========================================================
   ADMIN / TEACHER: VIEW ALL EVENTS (OPTIONAL BUT RECOMMENDED)
   ========================================================= */
router.get(
  "/all",
  auth,
  role(["admin", "teacher"]),
  async (req, res) => {
    try {
      const events = await Event.find({
        universityCode: req.user.universityCode,
      })
        .populate("organizers", "name department")
        .populate("createdBy", "name")
        .sort({ date: 1 });

      res.json(events);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  }
);

module.exports = router;
