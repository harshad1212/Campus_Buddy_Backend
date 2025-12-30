const express = require("express");
const ForumQuestion = require("../models/ForumQuestion");
const authMiddleware = require("../middleware/auth");
const User = require("../models/User");
const addPoints = require("../utils/addPoints");

const router = express.Router();

/**
 * 1️⃣ Ask a Question
 */


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
      askedBy: req.user._id, // ✅ FIX
    });

    res.status(201).json(newQuestion);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 2️⃣ Get All Questions
 */
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

/**
 * 3️⃣ Get Single Question
 */
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

/**
 * 4️⃣ Post Answer
 */
router.post("/answer/:questionId", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Answer text required" });

    const question = await ForumQuestion.findById(req.params.questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    question.answers.push({
      text,
      userId: req.user._id,
    });

    await addPoints({
      userId: req.user._id,
      type: "forumAnswer",
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



// ✏️ Edit Answer
router.put(
  "/answer/:questionId/:answerId",
  authMiddleware,
  async (req, res) => {
    try {
      const { text } = req.body;
      const question = await ForumQuestion.findById(req.params.questionId);

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      const answer = question.answers.id(req.params.answerId);
      if (!answer) {
        return res.status(404).json({ message: "Answer not found" });
      }

      if (answer.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      }
      console.log("Editing answer:", answer);
      answer.text = text;
      await question.save();
      await question.populate([
  { path: "askedBy", select: "name avatarUrl" },
  { path: "answers.userId", select: "name avatarUrl" }
]);

      res.json(question);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// 🗑️ Delete Answer
router.delete(
  "/answer/:questionId/:answerId",
  authMiddleware,
  async (req, res) => {
    try {
      const question = await ForumQuestion.findById(req.params.questionId);

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      const answer = question.answers.id(req.params.answerId);
      if (!answer) {
        return res.status(404).json({ message: "Answer not found" });
      }

      if (answer.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      }

      await answer.deleteOne();
      await question.save();
      await question.populate([
  { path: "askedBy", select: "name avatarUrl" },
  { path: "answers.userId", select: "name avatarUrl" }
]);

      res.json(question);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);


/**
 * 5️⃣ Vote Answer
 */
router.post("/vote/:questionId/:answerId", authMiddleware, async (req, res) => {
  try {
    const { vote } = req.body;
    if (![1, -1].includes(vote))
      return res.status(400).json({ message: "Invalid vote value" });

    const question = await ForumQuestion.findById(req.params.questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    const answer = question.answers.id(req.params.answerId);
    if (!answer) return res.status(404).json({ message: "Answer not found" });

    const existingVote = answer.voters.find(
      (v) => v.userId.toString() === req.user._id.toString()
    );

    if (existingVote) {
      answer.votes -= existingVote.vote;
      existingVote.vote = vote;
    } else {
      answer.voters.push({ userId: req.user._id, vote });

      // ⭐ Points only on first UPVOTE
      if (vote === 1) {
        await addPoints({
          userId: answer.userId,
          type: "forumAnswer",
          points: 2,
          refId: answer._id,
          description: "Answer upvoted",
        });
      }
    }

    answer.votes += vote;
    await question.save();
    res.json(answer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


/**
 * 6️⃣ Mark Best Answer
 */
router.post(
  "/best-answer/:questionId/:answerId",
  authMiddleware,
  async (req, res) => {
    try {
      const question = await ForumQuestion.findById(req.params.questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      if (question.askedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      }

      question.answers.forEach((a) => (a.isBestAnswer = false));

      const bestAnswer = question.answers.id(req.params.answerId);
      if (!bestAnswer) {
        return res.status(404).json({ message: "Answer not found" });
      }

      bestAnswer.isBestAnswer = true;
      await addPoints({
        userId: bestAnswer.userId,
        type: "forumBestAnswer",
        points: 10,
        refId: bestAnswer._id,
        description: "Marked as best answer",
      });


      await question.save();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.post("/best-answer/:questionId/:answerId", authMiddleware, async (req, res) => {
  try {
    const question = await ForumQuestion.findById(req.params.questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    if (question.askedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    question.answers.forEach((a) => (a.isBestAnswer = false));

    const bestAnswer = question.answers.id(req.params.answerId);
    if (!bestAnswer) return res.status(404).json({ message: "Answer not found" });

    bestAnswer.isBestAnswer = true;

    await addPoints({
      userId: bestAnswer.userId,
      type: "forumBestAnswer",
      points: 10,
      refId: bestAnswer._id,
      description: "Marked as best answer",
    });

    await question.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;
