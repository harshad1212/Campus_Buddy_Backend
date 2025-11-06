// server/controllers/adminController.js
const User = require("../models/User");
const Resource = require("../models/Resource");
const Event = require("../models/Event");

exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalResources = await Resource.countDocuments();
    const totalEvents = await Event.countDocuments();
    const activeUsers = await User.find({ isActive: true }).countDocuments();

    res.json({ totalUsers, totalResources, totalEvents, activeUsers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPendingResources = async (req, res) => {
  const pending = await Resource.find({ isApproved: false });
  res.json(pending);
};

exports.approveResource = async (req, res) => {
  await Resource.findByIdAndUpdate(req.params.id, { isApproved: true });
  res.json({ message: "Resource approved" });
};

exports.rejectResource = async (req, res) => {
  await Resource.findByIdAndDelete(req.params.id);
  res.json({ message: "Resource rejected" });
};

exports.getPendingEvents = async (req, res) => {
  const pending = await Event.find({ approvedByAdmin: false });
  res.json(pending);
};

exports.approveEvent = async (req, res) => {
  await Event.findByIdAndUpdate(req.params.id, { approvedByAdmin: true });
  res.json({ message: "Event approved" });
};

exports.rejectEvent = async (req, res) => {
  await Event.findByIdAndDelete(req.params.id);
  res.json({ message: "Event rejected" });
};

exports.manageUsers = async (req, res) => {
  const users = await User.find({}, "name email role isBanned");
  res.json(users);
};

exports.toggleBanUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  user.isBanned = !user.isBanned;
  await user.save();
  res.json({ message: `User ${user.isBanned ? "banned" : "unbanned"}` });
};
