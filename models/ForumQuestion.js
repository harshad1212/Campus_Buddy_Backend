const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    votes: {
      type: Number,
      default: 0,
    },
    voters: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        vote: {
          type: Number, // +1 or -1
        },
      },
    ],
    isBestAnswer: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const forumQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    tags: [
      {
        type: String,
      },
    ],
    askedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    answers: [answerSchema],
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ForumQuestion", forumQuestionSchema);
