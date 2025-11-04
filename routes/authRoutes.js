// routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const University = require("../models/University");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// --- Registration Route (Admin / Teacher / Student) ---
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      universityName,
      universityCode,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All required fields must be provided" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already registered" });

    let university;

    if (role === "admin") {
      if (!universityName || !universityCode)
        return res.status(400).json({ error: "University name and code are required" });

      const existingUni = await University.findOne({ code: universityCode });
      if (existingUni)
        return res.status(400).json({ error: "University code already exists" });

      university = await University.create({
        name: universityName,
        code: universityCode,
        email,
        adminId: null,
      });
    } else {
      if (!universityCode)
        return res.status(400).json({ error: "University code is required" });

      university = await University.findOne({ code: universityCode });
      if (!university)
        return res.status(404).json({ error: "Invalid university code" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      universityId: university._id,
    });

    if (role === "admin") {
      university.adminId = newUser._id;
      await university.save();
    }

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role, universityId: university._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      token,
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
