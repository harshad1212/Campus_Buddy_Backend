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

module.exports = router;
