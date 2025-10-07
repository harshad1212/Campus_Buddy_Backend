const express = require("express");
const multer = require("multer");
const path = require("path");
const Resource = require("../models/Resource");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// Multer config — upload to /uploads/resources/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/resources"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// 📤 Upload Resource
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const newRes = new Resource({
      title: req.body.title,
      description: req.body.description,
      subject: req.body.subject,
      course: req.body.course,
      semester: req.body.semester,
      tags: req.body.tags ? req.body.tags.split(",") : [],
      fileUrl: `/uploads/resources/${req.file.filename}`,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      uploader: req.user._id,
    });

    await newRes.save();
    res.status(201).json({ message: "Resource uploaded successfully", resource: newRes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// 📚 Get All Resources
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    const query = search ? { title: { $regex: search, $options: "i" } } : {};
    const resources = await Resource.find(query).populate("uploader", "name email");
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ❤️ Like / Unlike
router.post("/:id/like", authMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    const userId = req.user._id;

    if (resource.likes.includes(userId)) {
      resource.likes.pull(userId);
    } else {
      resource.likes.push(userId);
    }

    await resource.save();
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 💬 Comment
router.post("/:id/comment", authMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    resource.comments.push({ user: req.user._id, text: req.body.text });
    await resource.save();
    res.json(resource.comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📥 Download Counter
router.post("/:id/download", async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    resource.downloadCount += 1;
    await resource.save();
    res.json({ count: resource.downloadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
