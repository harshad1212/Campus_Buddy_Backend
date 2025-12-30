const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const Resource = require("../models/Resource");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ✅ Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Multer temp upload folder
const upload = multer({ dest: "uploads/resources" });

/**
 * 📁 Upload a new resource
 */
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { title, description, subject, stream, semester } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const universityId = req.user.universityId; // ✅ Fix: get from logged-in user
    if (!universityId) {
      return res.status(400).json({ error: "User is not linked to a university" });
    }

    // Clean file name
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    const cleanName = `${baseName}${ext}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "resources_uploads",
      resource_type: "raw",
      public_id: cleanName,
      use_filename: true,
      unique_filename: false,
      format: ext.substring(1),
    });

    // Remove temp file
    fs.unlinkSync(file.path);

    // Save to MongoDB
    const newResource = new Resource({
      title,
      description,
      subject,
      stream,
      semester,
      fileUrl: result.secure_url,
      fileName: cleanName,
      fileType: file.mimetype,
      universityId,
      uploader: req.user._id,
      downloadCount: 0,
    });

    await newResource.save();
    res.status(201).json({
      message: "✅ Resource uploaded successfully",
      resource: newResource,
    });
  } catch (err) {
    console.error("❌ Upload Error:", err);
    res.status(500).json({ error: "Failed to upload resource" });
  }
});

/**
 * 📚 Get all resources (filtered)
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { stream, semester, subject } = req.query;
    const filters = {};

    // Filter by logged-in user's university
    filters.universityId = req.user.universityId;

    if (stream) filters.stream = stream.trim();
    if (semester) filters.semester = Number(semester);
    if (subject) filters.subject = subject.trim();

    const resources = await Resource.find(filters)
      .populate("uploader", "name email")
      .populate("comments.user", "name")
      .sort({ createdAt: -1 });

    res.json(resources);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});


/**
 * ❤️ Like / Unlike a resource
 */
router.post("/:id/like", authMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: "Resource not found" });

    const userId = req.user.id;
    const alreadyLiked = resource.likes.includes(userId);

    if (alreadyLiked)
      resource.likes = resource.likes.filter((uid) => uid.toString() !== userId);
    else resource.likes.push(userId);

    await resource.save();

    res.json({
      liked: !alreadyLiked,
      likesCount: resource.likes.length,
    });
  } catch (err) {
    console.error("❌ Like error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * 💬 Add comment
 */
router.post("/:id/comment", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Comment text is required" });

    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: "Resource not found" });

    resource.comments.push({
      user: req.user._id,
      text,
      createdAt: new Date(),
    });

    await resource.save();

    const populated = await Resource.findById(req.params.id).populate(
      "comments.user",
      "name"
    );
    const lastComment = populated.comments[populated.comments.length - 1];

    res.json(lastComment);
  } catch (err) {
    console.error("❌ Comment error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * 📥 Download Resource (increment count)
 */
router.get("/:id/download", authMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: "Resource not found" });

    resource.downloadCount += 1;
    await resource.save();

    res.json({
      message: "✅ Download count updated",
      fileUrl: resource.fileUrl,
      downloadCount: resource.downloadCount,
    });
  } catch (err) {
    console.error("❌ Download error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * 👤 Get all resources uploaded by the logged-in user
 */
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const uploaderId = req.query.uploaderId || req.user.id;
    const resources = await Resource.find({ uploader: uploaderId })
      .populate("uploader", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json(resources || []);
  } catch (err) {
    console.error("❌ Error fetching user resources:", err);
    res.status(500).json({ message: "Server error while fetching user resources." });
  }
});

/**
 * 🗑️ Delete a resource (only uploader can delete)
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const resourceId = req.params.id;
    const userId = req.user.id;

    const resource = await Resource.findById(resourceId);
    if (!resource) return res.status(404).json({ message: "Resource not found." });

    if (resource.uploader.toString() !== userId)
      return res.status(403).json({ message: "Not authorized to delete this resource." });

    if (resource.fileUrl && resource.fileUrl.includes("cloudinary")) {
      try {
        const publicId = resource.fileUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
      } catch (cloudErr) {
        console.warn("⚠️ Cloudinary delete warning:", cloudErr.message);
      }
    }

    await Resource.findByIdAndDelete(resourceId);
    res.status(200).json({ message: "✅ Resource deleted successfully." });
  } catch (err) {
    console.error("❌ Error deleting resource:", err);
    res.status(500).json({ message: "Server error while deleting resource." });
  }
});

module.exports = router;
