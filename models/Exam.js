const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    questions: [
      {
        question: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["multiple-choice", "true-false"],
          default: "multiple-choice",
        },
        options: [String],
        correctAnswer: {
          type: String,
          required: true,
        },
        points: {
          type: Number,
          default: 1,
        },
      },
    ],
    duration: {
      type: Number,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalPoints: Number,
  },
  {
    timestamps: true,
  }
);

const examAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      refer: "Course",
      required: true,
    },
    answers: [
      {
        answer: {
          type: String,
          required: true,
        },
        score: {
          type: Number,
          default: 0,
        },
      },
    ],
    totalScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware to delete exam attempts when exam is deleted
examSchema.pre("findOneAndDelete", async function () {
  const ExamAttempt = mongoose.model("ExamAttempt");
  await ExamAttempt.deleteMany({ exam: this.getQuery()._id });
});

examSchema.pre("deleteOne", async function () {
  const ExamAttempt = mongoose.model("ExamAttempt");
  await ExamAttempt.deleteMany({ exam: this.getQuery()._id });
});

const Exam = mongoose.model("Exam", examSchema);
const ExamAttempt = mongoose.model("ExamAttempt", examAttemptSchema);

module.exports = {
  Exam,
  ExamAttempt,
};
