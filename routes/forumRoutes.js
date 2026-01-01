// routes/forumroutes.js
const express = require("express");
const ForumQuestion = require("../models/ForumQuestion");
const authMiddleware = require("../middleware/auth");
const addPoints = require("../utils/addPoints");

const router = express.Router();

/* ===============================
   Ask Question
================================ */
router.post("/question", authMiddleware, async (req, res) => {
  try {
    const { question, description, tags } = req.body;
    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const newQuestion = await ForumQuestion.create({
      question,
      description,
      tags,
      askedBy: req.user._id,
    });

    res.status(201).json(newQuestion);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===============================
   Get All Questions
================================ */
router.get("/questions", authMiddleware, async (req, res) => {
  try {
    const questions = await ForumQuestion.find()
      .populate("askedBy", "name email avatarUrl")
      .sort({ createdAt: -1 });

    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===============================
   Get Single Question
================================ */
router.get("/question/:id", authMiddleware, async (req, res) => {
  try {
    const question = await ForumQuestion.findById(req.params.id)
      .populate("askedBy", "name avatarUrl")
      .populate("answers.userId", "name avatarUrl");

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    question.views += 1;
    await question.save();

    res.json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===============================
   Post Answer
================================ */
router.post("/answer/:questionId", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Answer text required" });

    const question = await ForumQuestion.findById(req.params.questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    question.answers.push({
      text,
      userId: req.user._id,
      votes: 0,
      voters: [],
    });

    await addPoints({
      userId: req.user._id,
      type:  "FORUM_ANSWER",
      points: 5,
      refId: question._id,
      description: "Posted a forum answer",
    });

    await question.save();
    res.json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===============================
   Vote Answer (FINAL)
================================ */
/**
 * 5️⃣ Vote Answer (LIKE ↔ DISLIKE SWITCH ALLOWED)
 */
router.post("/vote/:questionId/:answerId", authMiddleware, async (req, res) => {
  try {
    const { vote } = req.body;
    if (![1, -1].includes(vote)) {
      return res.status(400).json({ message: "Invalid vote value" });
    }

    const question = await ForumQuestion.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const answer = question.answers.id(req.params.answerId);
    if (!answer) {
      return res.status(404).json({ message: "Answer not found" });
    }

    const existingVote = answer.voters.find(
      (v) => v.userId.toString() === req.user._id.toString()
    );

    if (existingVote) {
      // ❌ Same vote again → block
      if (existingVote.vote === vote) {
        return res.status(400).json({ message: "Already voted" });
      }

      // 🔁 Switch vote (👍 → 👎 or 👎 → 👍)
      answer.votes -= existingVote.vote; // remove old
      existingVote.vote = vote;
      answer.votes += vote; // apply new
    } else {
      // 🆕 First vote
      answer.voters.push({ userId: req.user._id, vote });
      answer.votes += vote;

      // ⭐ Points ONLY on first UPVOTE
      if (vote === 1) {
        await addPoints({
          userId: answer.userId,
          type: "FORUM_UPVOTE",
          points: 2,
          refId: answer._id,
          description: "Answer upvoted",
        });
      }
    }

    await question.save();
    res.json({ votes: answer.votes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


/* ===============================
   Best Answer
================================ */
router.post("/best-answer/:questionId/:answerId", authMiddleware, async (req, res) => {
  try {
    const question = await ForumQuestion.findById(req.params.questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    if (question.askedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    question.answers.forEach((a) => (a.isBestAnswer = false));

    const bestAnswer = question.answers.id(req.params.answerId);
    if (!bestAnswer) return res.status(404).json({ message: "Answer not found" });

    bestAnswer.isBestAnswer = true;

    await addPoints({
      userId: bestAnswer.userId,
      type: "FORUM_BEST_ANSWER",
      points: 10,
      refId: bestAnswer._id,
      description: "Marked as best answer",
    });

    await question.save();
    res.json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
