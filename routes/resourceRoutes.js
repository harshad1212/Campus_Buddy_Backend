const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cloudinary = require("cloudinary").v2;

const Resource = require("../models/Resource");
const authMiddleware = require("../middleware/auth");
const addPoints = require("../utils/addPoints"); // ⭐ IMPORTANT

const router = express.Router();

/* ================= CLOUDINARY CONFIG ================= */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ================= MULTER ================= */
const upload = multer({ dest: "uploads/resources" });

/* =====================================================
   📁 UPLOAD RESOURCE
===================================================== */
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const { title, description, subject, stream, semester } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const universityId = req.user.universityId;
      if (!universityId) {
        return res
          .status(400)
          .json({ error: "User is not linked to a university" });
      }

      // Clean filename
      const ext = path.extname(file.originalname);
      const baseName = path
        .basename(file.originalname, ext)
        .replace(/\s+/g, "_");
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

      fs.unlinkSync(file.path);

      // Save resource
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

      // ⭐ ADD POINTS (UPLOAD)
      await addPoints({
        userId: req.user._id,
        type: "RESOURCE_UPLOAD",
        points: 10,
        refId: newResource._id,
        description: "Uploaded a resource",
      });

      res.status(201).json({
        message: "✅ Resource uploaded successfully",
        resource: newResource,
      });
    } catch (err) {
      console.error("❌ Upload Error:", err);
      res.status(500).json({ error: "Failed to upload resource" });
    }
  }
);

/* =====================================================
   📚 GET ALL RESOURCES
===================================================== */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { stream, semester, subject } = req.query;
    const filters = { universityId: req.user.universityId };

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

/* =====================================================
   ❤️ LIKE / UNLIKE RESOURCE
===================================================== */
router.post("/:id/like", authMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource)
      return res.status(404).json({ message: "Resource not found" });

    const userId = req.user.id;
    const alreadyLiked = resource.likes.includes(userId);

    if (alreadyLiked) {
      resource.likes = resource.likes.filter(
        (uid) => uid.toString() !== userId
      );
    } else {
      resource.likes.push(userId);

      // ⭐ ADD POINTS TO UPLOADER
      await addPoints({
        userId: resource.uploader.toString(),
        type: "RESOURCE_LIKE",
        points: 2,
        refId: resource._id,
        description: "Resource liked",
      });
    }

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

/* =====================================================
   💬 ADD COMMENT
===================================================== */
router.post("/:id/comment", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text)
      return res.status(400).json({ message: "Comment text is required" });

    const resource = await Resource.findById(req.params.id);
    if (!resource)
      return res.status(404).json({ message: "Resource not found" });

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

    res.json(populated.comments.at(-1));
  } catch (err) {
    console.error("❌ Comment error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =====================================================
   📥 DOWNLOAD RESOURCE
===================================================== */
router.get("/:id/download", authMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource)
      return res.status(404).json({ message: "Resource not found" });

    resource.downloadCount += 1;
    await resource.save();

    // ⭐ ADD POINTS TO UPLOADER
    await addPoints({
      userId: resource.uploader,
      type: "RESOURCE_DOWNLOAD",
      points: 1,
      refId: resource._id,
      description: "Resource downloaded",
    });

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

/* =====================================================
   👤 MY RESOURCES
===================================================== */
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const uploaderId = req.query.uploaderId || req.user.id;

    const resources = await Resource.find({ uploader: uploaderId })
      .populate("uploader", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(resources || []);
  } catch (err) {
    console.error("❌ My resources error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =====================================================
   🗑️ DELETE RESOURCE
===================================================== */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource)
      return res.status(404).json({ message: "Resource not found" });

    if (resource.uploader.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this resource" });
    }

    if (resource.fileUrl?.includes("cloudinary")) {
      const publicId = resource.fileUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    }

    await Resource.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "✅ Resource deleted successfully" });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
