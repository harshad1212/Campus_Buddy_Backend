// server/routes/adminRoutes.js
const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const {
  getDashboardStats,
  getPendingResources,
  approveResource,
  rejectResource,
  getPendingEvents,
  approveEvent,
  rejectEvent,
  manageUsers,
  toggleBanUser
} = require("../controllers/adminController");

const router = express.Router();

// Protect all admin routes
router.use(authMiddleware);

// Admin routes
router.get("/stats", getDashboardStats);
router.get("/resources/pending", getPendingResources);
router.put("/resources/approve/:id", approveResource);
router.delete("/resources/reject/:id", rejectResource);

router.get("/events/pending", getPendingEvents);
router.put("/events/approve/:id", approveEvent);
router.delete("/events/reject/:id", rejectEvent);

router.get("/users", manageUsers);
router.put("/users/toggle-ban/:id", toggleBanUser);

module.exports = router;
