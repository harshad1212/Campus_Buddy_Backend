const express = require("express");
const bcrypt = require("bcrypt");
const University = require("../models/University");

const router = express.Router();

// 🧩 GET all universities
router.get("/universities", async (req, res) => {
  try {
    const universities = await University.find({}, "name code");
    res.json(universities);
  } catch (err) {
    console.error("❌ Error fetching universities:", err);
    res.status(500).json({ error: "Failed to fetch universities" });
  }
});

// 🏫 Register a new university
router.post("/register", async (req, res) => {
  try {
    const { name, email, code, password, teacherCode, studentCode } = req.body;

    const existing = await University.findOne({ code });
    if (existing)
      return res.status(400).json({ error: "University code already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const uni = new University({
      name,
      email,
      code,
      password: hashed,
      teacherCode,
      studentCode,
    });

    await uni.save();
    res.json({ message: "University registered successfully", uni });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
