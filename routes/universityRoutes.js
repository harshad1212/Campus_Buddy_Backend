const express = require("express");
const University = require("../models/University");

const router = express.Router();

/* ================= GET ALL UNIVERSITIES ================= */
router.get("/universities", async (req, res) => {
  try {
    const universities = await University.find({}, "name code");
    res.json(universities);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch universities" });
  }
});

/* ================= GET DEPARTMENTS BY UNIVERSITY CODE ================= */
router.get("/:code/departments", async (req, res) => {
  try {
    const { code } = req.params;

    const university = await University.findOne({
      code: code.toUpperCase(),
    });

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    res.json({
      departments: university.departments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET SEMESTERS (STATIC FOR NOW) ================= */
router.get("/department/:department/semesters", async (req, res) => {
  // same semesters for all departments
  res.json({
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
  });
});
router.post("/:code/departments", async (req, res) => {
  try {
    const { code } = req.params;
    const { department } = req.body;

    if (!department) {
      return res.status(400).json({ error: "Department is required" });
    }

    const university = await University.findOneAndUpdate(
      { code: code.toUpperCase() },
      { $addToSet: { departments: department } }, // prevents duplicates
      { new: true }
    );

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    res.status(200).json({
      success: true,
      departments: university.departments,
    });
  } catch (err) {
    console.error("ADD DEPARTMENT ERROR:", err);
    res.status(500).json({ error: "Failed to add department" });
  }
});
router.delete("/:code/departments", async (req, res) => {
  try {
    const { code } = req.params;
    const { department } = req.body;

    const university = await University.findOneAndUpdate(
      { code: code.toUpperCase() },
      { $pull: { departments: department } },
      { new: true }
    );

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    res.status(200).json({
      success: true,
      departments: university.departments,
    });
  } catch (err) {
    console.error("REMOVE DEPARTMENT ERROR:", err);
    res.status(500).json({ error: "Failed to remove department" });
  }
});


module.exports = router;
