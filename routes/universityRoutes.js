const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const University = require("../models/University");

router.post("/register", async (req, res) => {
  try {
    const { name, email, code, password, teacherCode, studentCode } = req.body;

    const existing = await University.findOne({ code });
    if (existing) return res.status(400).json({ error: "University code already exists" });

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
