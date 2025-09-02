const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
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
    dueDate: {
      type: Date,
      required: true,
    },
    pdf: {
      filename: String,
      originalName: String,
      path: String,
      uploadDate: {
        type: Date,
        default: Date.now,
      },
    },
    maxScore: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pdfFilePath: {
      type: String,
      required: true,
    },
    score: Number,
    maxScore: Number,
    feedback: String,
    repaired: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware to delete assignment submissions when assignment is deleted or edited
assignmentSchema.pre("findOneAndUpdate", async function () {
  const AssignmentSubmission = mongoose.model("AssignmentSubmission");
  await AssignmentSubmission.deleteMany({ assignment: this.getQuery()._id });
});

assignmentSchema.pre("findOneAndDelete", async function () {
  const AssignmentSubmission = mongoose.model("AssignmentSubmission");
  await AssignmentSubmission.deleteMany({ assignment: this.getQuery()._id });
});

assignmentSchema.pre("deleteOne", async function () {
  const AssignmentSubmission = mongoose.model("AssignmentSubmission");
  await AssignmentSubmission.deleteMany({ assignment: this.getQuery()._id });
});

const Assignment = mongoose.model("Assignment", assignmentSchema);
const AssignmentSubmission = mongoose.model(
  "AssignmentSubmission",
  assignmentSubmissionSchema
);

module.exports = {
  Assignment,
  AssignmentSubmission,
};
