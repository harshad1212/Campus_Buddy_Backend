const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Resource = require("../models/Resource");
const { authMiddleware } = require("../middleware/auth");

// Upload folder for resources
const resourcePath = path.join(__dirname, "../uploads/resources");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resourcePath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({ storage });

// 📤 Upload resource
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const resource = new Resource({
      title: req.body.title || file.originalname,
      description: req.body.description,
      subject: req.body.subject,
      course: req.body.course,
      semester: req.body.semester,
      fileUrl: `/uploads/resources/${file.filename}`,
      fileType: file.mimetype,
      fileName: file.originalname,
      uploader: req.user._id,
      approved: true,
    });

    await resource.save();
    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📚 Get filtered resources
router.get("/", authMiddleware, async (req, res) => {
  try {
    let { subject, course, semester } = req.query;

    // Validate filters
    if (!subject || !course || !semester) {
      return res.status(400).json({ error: "Please provide stream, semester, and subject" });
    }

    semester = Number(semester); // convert string to number

    const query = {
      approved: true,
      course,
      semester,
      subject,
    };

    const resources = await Resource.find(query)
      .populate("uploader", "name avatarUrl")
      .sort({ createdAt: -1 });

    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
