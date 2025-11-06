// routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const University = require("../models/University");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// --- Registration Route (Admin / Teacher / Student Request) ---
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      universityName,
      universityCode,
      teacherCode,
      studentCode,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ error: "All required fields must be provided" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "Email already registered" });

    let university;

    // --- Admin registers university ---
    if (role === "admin") {
      if (!universityName || !universityCode || !teacherCode || !studentCode)
        return res.status(400).json({
          error: "University name, code, teacherCode, and studentCode required",
        });

      const existingUni = await University.findOne({ code: universityCode });
      if (existingUni)
        return res.status(400).json({ error: "University code already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);

      university = await University.create({
        name: universityName,
        code: universityCode,
        email,
        password: hashedPassword,
        teacherCode,
        studentCode,
        adminId: null,
      });

      const newAdmin = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        universityId: university._id,
        isApproved: true, // ✅ Admins are automatically approved
      });

      university.adminId = newAdmin._id;
      await university.save();

      const token = jwt.sign(
        { id: newAdmin._id, role: newAdmin.role, universityId: university._id },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(201).json({
        message: "University registered successfully",
        user: {
          id: newAdmin._id,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
        },
        token,
      });
    }

    // --- Student / Teacher registration requests ---
    if (!universityCode)
      return res.status(400).json({ error: "University code is required" });

    university = await University.findOne({ code: universityCode });
    if (!university)
      return res.status(404).json({ error: "Invalid university code" });

    const correctCode =
      role === "teacher" ? university.teacherCode : university.studentCode;
    if (!correctCode)
      return res.status(400).json({ error: "Invalid registration code" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      universityId: university._id,
      isApproved: false, // ❗ must be approved by admin
    });

    console.log(
      `📩 Registration request: ${name} (${role}) for ${university.name}`
    );

    res.status(201).json({
      message: "Registration request sent! Admin will review and approve.",
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
