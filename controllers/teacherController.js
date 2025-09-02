const { Course } = require("../models/Course");
const { Exam, ExamAttempt } = require("../models/Exam");
const { Assignment, AssignmentSubmission } = require("../models/Assignment");
const { User } = require("../models/User");
const multer = require("multer");
const path = require("path");

// Get teacher's courses
const getCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      professor: req.user._id,
    })
      .populate("students", "firstName lastName email")
      .populate("department", "name");

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add lecture to course
const addLecture = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, youtubeUrl, order } = req.body;

    const course = await Course.findOne({
      _id: courseId,
      professor: req.user._id,
    });

    if (!course) {
      return res
        .status(404)
        .json({ error: "Course not found or unauthorized" });
    }

    course.lectures.push({
      title,
      description,
      youtubeUrl,
      order: order || course.lectures.length,
    });

    await course.save();
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update lecture
const updateLecture = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const { title, description, youtubeUrl, order } = req.body;

    const course = await Course.findOne({
      _id: courseId,
      professor: req.user._id,
    });

    if (!course) {
      return res
        .status(404)
        .json({ error: "Course not found or unauthorized" });
    }

    const lecture = course.lectures.id(lectureId);
    if (!lecture) {
      return res.status(404).json({ error: "Lecture not found" });
    }

    lecture.title = title;
    lecture.description = description;
    lecture.youtubeUrl = youtubeUrl;
    lecture.order = order;

    await course.save();
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete lecture
const deleteLecture = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;

    const course = await Course.findOne({
      _id: courseId,
      professor: req.user._id,
    });

    if (!course) {
      return res
        .status(404)
        .json({ error: "Course not found or unauthorized" });
    }

    course.lectures.id(lectureId).remove();
    await course.save();

    res.json({ message: "Lecture deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create exam (updated to remove professor field)
const createExam = async (req, res) => {
  try {
    const {
      title,
      description,
      course,
      questions,
      duration,
      startDate,
      endDate,
    } = req.body;

    // Verify course belongs to teacher
    const courseDoc = await Course.findOne({
      _id: course,
      professor: req.user._id,
    });

    if (!courseDoc) {
      return res
        .status(404)
        .json({ error: "Course not found or unauthorized" });
    }

    // Validate questions based on type
    for (let question of questions) {
      if (question.type === "photo-answer") {
        // Photo-answer questions don't need options or correctAnswer
        question.options = [];
        question.correctAnswer = undefined;
      } else if (
        question.type === "multiple-choice" &&
        (!question.options || question.options.length === 0)
      ) {
        return res
          .status(400)
          .json({ error: "Multiple choice questions must have options" });
      } else if (
        (question.type === "multiple-choice" ||
          question.type === "true-false") &&
        !question.correctAnswer
      ) {
        return res.status(400).json({
          error: `${question.type} questions must have a correct answer`,
        });
      }
    }

    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

    const exam = new Exam({
      title,
      description,
      course,
      questions,
      duration,
      startDate,
      endDate,
      totalPoints,
    });

    await exam.save();
    res.status(201).json(exam);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get teacher's exams
const getExams = async (req, res) => {
  try {
    const teacherCourses = await Course.find({
      professor: req.user._id,
    }).select("_id");
    const courseIds = teacherCourses.map((course) => course._id);

    const exams = await Exam.find({
      course: { $in: courseIds },
    }).populate("course", "name");

    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get exam details
const getExamDetails = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId).populate(
      "course",
      "name professor"
    );

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Verify teacher owns this exam's course
    const course = await Course.findOne({
      _id: exam.course._id,
      professor: req.user._id,
    });

    if (!course) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getExamGrades = async (req, res) => {
  try {
    const { examId } = req.params;

    // Get all attempts for the exam and populate user details
    const attempts = await ExamAttempt.find({ exam: examId })
      .populate("user", "firstName lastName email") // Include user details
      .populate("exam", "title totalPoints") // Include exam details
      .sort({ totalScore: -1 }); // Sort by score descending

    if (!attempts || attempts.length === 0) {
      return res
        .status(404)
        .json({ message: "No attempts found for this exam" });
    }

    res.json({
      examTitle: attempts[0].exam.title,
      totalPoints: attempts[0].exam.totalPoints,
      attempts: attempts.map((attempt) => ({
        studentId: attempt.user._id,
        studentName: attempt.user.firstName + " " + attempt.user.lastName,
        studentUsername: attempt.user.username,
        totalScore: attempt.totalScore,
        submittedAt: attempt.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching exam grades:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching exam grades" });
  }
};

// Grade exam attempt (new function)
const gradeExamAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body; // Array of { questionIndex, points, isCorrect }

    const attempt = await ExamAttempt.findById(attemptId)
      .populate("exam")
      .populate("student", "firstName lastName email");

    if (!attempt) {
      return res.status(404).json({ error: "Exam attempt not found" });
    }

    // Verify teacher owns this exam's course
    const course = await Course.findOne({
      _id: attempt.exam.course,
      professor: req.user._id,
    });

    if (!course) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Update answers with grading
    answers.forEach((gradedAnswer) => {
      const answerIndex = attempt.answers.findIndex(
        (ans) => ans.questionIndex === gradedAnswer.questionIndex
      );

      if (answerIndex !== -1) {
        attempt.answers[answerIndex].points = gradedAnswer.points;
        attempt.answers[answerIndex].isCorrect = gradedAnswer.isCorrect;
        attempt.answers[answerIndex].manuallyGraded = true;
      }
    });

    // Calculate total score
    const totalScore = attempt.answers.reduce(
      (sum, ans) => sum + (ans.points || 0),
      0
    );
    attempt.totalScore = totalScore;

    // Update grading status
    const totalQuestions = attempt.exam.questions.length;
    const gradedQuestions = attempt.answers.filter(
      (ans) => ans.manuallyGraded || ans.isCorrect !== null
    ).length;

    if (gradedQuestions === totalQuestions) {
      attempt.gradingStatus = "fully_graded";
    } else if (gradedQuestions > 0) {
      attempt.gradingStatus = "partially_graded";
    }

    await attempt.save();
    res.json(attempt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create assignment
const createAssignment = async (req, res) => {
  try {
    const { title, description, course, dueDate, maxScore } = req.body;

    // Verify course belongs to teacher
    const courseDoc = await Course.findOne({
      _id: course,
      professor: req.user._id,
    });

    if (!courseDoc) {
      return res
        .status(404)
        .json({ error: "Course not found or unauthorized" });
    }

    // Handle uploaded PDF
    let pdf = null;
    if (req.file) {
      pdf = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: path.join("uploads", req.file.filename),
      };
    }

    const assignment = new Assignment({
      title,
      description,
      course,
      dueDate,
      maxScore,
      pdf,
    });

    await assignment.save();
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get teacher's assignments (updated to work with new schema)
const getAssignments = async (req, res) => {
  try {
    const teacherCourses = await Course.find({
      professor: req.user._id,
    }).select("_id");
    const courseIds = teacherCourses.map((course) => course._id);

    const assignments = await Assignment.find({
      course: { $in: courseIds },
    }).populate("course", "name code");

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get assignment submissions for grading
const getAssignmentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const submissions = await AssignmentSubmission.find({
      assignment: assignmentId,
    })
      .populate("student", "firstName lastName email")
      .populate("assignment", "title maxScore");

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete exam and associated attempts (updated)
const deleteExam = async (req, res) => {
  try {
    const { examId } = req.params;

    // Verify teacher owns this exam
    const exam = await Exam.findById(examId).populate("course");
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const course = await Course.findOne({
      _id: exam.course._id,
      professor: req.user._id,
    });

    if (!course) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Delete the exam (middleware will handle deletion of attempts)
    await Exam.findByIdAndDelete(examId);

    res.json({ message: "Exam and associated attempts deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete assignment (updated to work with new schema)
const deleteAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    // Find assignment and verify it belongs to a course taught by this teacher
    const assignment = await Assignment.findById(assignmentId).populate(
      "course"
    );
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const course = await Course.findOne({
      _id: assignment.course._id,
      professor: req.user._id,
    });

    if (!course) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Delete the assignment (middleware will handle deletion of submissions)
    await Assignment.findByIdAndDelete(assignmentId);

    res.json({
      message: "Assignment and associated submissions deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const gradeAssignment = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback } = req.body;

    const submission = await AssignmentSubmission.findById(submissionId)
      .populate("assignment")
      .populate("student");

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    // Validate score against maxScore
    if (score === undefined || score === null || isNaN(score)) {
      return res.status(400).json({ error: "Valid score is required" });
    }

    if (
      score < 0 ||
      (submission.assignment.maxScore && score > submission.assignment.maxScore)
    ) {
      return res.status(400).json({
        error: `Score must be between 0 and ${submission.assignment.maxScore}`,
      });
    }

    submission.score = score;
    submission.feedback = feedback;
    submission.repaired = true;

    await submission.save();

    res.json({
      success: true,
      message: "Assignment graded successfully",
      submission,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getCourses,
  addLecture,
  updateLecture,
  deleteLecture,
  createExam,
  getExams,
  getExamDetails,
  getExamGrades,
  gradeExamAttempt,
  deleteExam,
  createAssignment,
  deleteAssignment,
  getAssignments,
  getAssignmentSubmissions,
  gradeAssignment,
};
