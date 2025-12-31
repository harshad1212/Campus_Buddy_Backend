const Event = require("../models/Event");

/* ================= CREATE EVENT ================= */
exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create({
      title: req.body.title,
      description: req.body.description,
      date: req.body.date,
      time: req.body.time,
      venue: req.body.venue,
      category: req.body.category,
      createdBy: req.user.id, // from auth middleware
    });

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ================= GET ALL APPROVED EVENTS ================= */
exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find({ status: "approved" })
      .populate("createdBy", "name")
      .sort({ date: 1 });

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= JOIN EVENT ================= */
exports.joinEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.attendees.includes(req.user.id)) {
      return res.status(400).json({ message: "Already joined" });
    }

    event.attendees.push(req.user.id);
    await event.save();

    res.status(200).json({ message: "Joined event successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= ADMIN: APPROVE EVENT ================= */
exports.approveEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );

    res.status(200).json({
      message: "Event approved",
      event,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
